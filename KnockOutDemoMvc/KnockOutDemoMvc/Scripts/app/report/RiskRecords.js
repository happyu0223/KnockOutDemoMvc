var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.start = function (options) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var $routeElem = $("#gmk-route"), route = {
            action: $routeElem.data("action")
        };
        if (route.action == 'CreditRisk') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.Report.RiskRecords(commonModels, {
                listUrl: 'Report/GetCreditRiskList'
            });
            function initialize(query) {
                query = $.extend({}, {
                    CommodityId: null,
                    CompanyId: null,
                    IsBuy: null,
                    IncludingClientWithCreditRiskOnly: false,
                    IncludeRelatedCompanies: false
                }, query);
                ko.mapping.fromJS(query, {
                    include: Object.getOwnPropertyNames(query)
                }, viewModel.query);
                viewModel.initialize(query);
            }
            utils.responseStateChange();
            initialize(commonModels.getQuery());
            ko.applyBindings(viewModel);
            commonModels.registerStateChange(initialize);
        } else if (route.action == 'ContractRisk') {
            var viewModel = new GMK.Report.ContractRiskRecords(commonModels, {
                listUrl: 'Report/GetChangedCreditRiskList'
            },options);
            viewModel.initialize();
            ko.applyBindings(viewModel);
        }
    });
};

GMK.Report.RiskRecords = function (commonModels, route, options) {
    this.commonModels = commonModels;
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.errorMsg = { show: ko.observable(false), message: ko.observable() };
    self.selectedContracts = ko.observableArray();
    self.selectedContractsSummary = {
        basisAmountTotal: ko.observable(),
        safeAmountTotal: ko.observable(),
        amountTotal: ko.observable(),
        basisWeightTotal: ko.observable(),
        safeWeightTotal: ko.observable(),
        weightTotal: ko.observable()
    };
    self.allCustomers = ko.observableArray();
    self.selectedCompany = ko.observable();
    self.selectedCommodity = ko.observable();
    self.selectedIsBuy = ko.observable();
    self.pageSummary = {
        count: ko.observable(),
        companyTotalAmount: ko.observable(),
        companyActualTotalAmount: ko.observable(),
        companyOverTotalAmount: ko.observable(),
        commoditiesSummary: ko.observableArray()
    };
    self.totalSummary = {
        count: ko.observable(),
        companyTotalAmount: ko.observable(),
        companyActualTotalAmount: ko.observable(),
        companyOverTotalAmount: ko.observable(),
        commoditiesSummary: ko.observableArray()
    };

    self.query = {
        CommodityId: ko.observable(),
        CompanyId: ko.observable(),
        IsBuy: ko.observable(),
        IncludingClientWithCreditRiskOnly: ko.observable(false),
        IncludeRelatedCompanies: ko.observable(false)
    };
    self.showRelated = ko.computed(function () {
        return self.query.CompanyId() != null;
    });

    //可用品种
    self.availableCommodity = ko.observableArray();

    self.onSearch = function () {
        _search(ko.mapping.toJS(self.query));
    };
    self.initialize = function (query) {
        var customers = commonModels._AllCustomers;
        Array.prototype.push.apply(customers, commonModels._AllCompanyGroups);
        self.allCustomers(customers);
        _search(query || ko.mapping.toJS(self.query));
    };
    self.onShowContracts = function (company, item) {
        self.selectedCommodity(item.name);
        self.selectedCompany(company.name);
        self.selectedIsBuy(company.isBuy);
        self.selectedContracts(item.contracts);
        var basisAmountTotal = 0;
        var safeAmountTotal = 0;
        var amountTotal = 0;
        var basisWeightTotal = 0;
        var safeWeightTotal = 0;
        var weightTotal = 0;
        $.each(item.contracts, function (i, detail) {
            basisAmountTotal += detail.basisAmount;
            safeAmountTotal += detail.safeAmount;
            amountTotal += detail.amount;
            basisWeightTotal += detail.basisWeight;
            safeWeightTotal += detail.safeWeight;
            weightTotal += detail.weight;
        });

        self.selectedContractsSummary.basisAmountTotal(basisAmountTotal);
        self.selectedContractsSummary.safeAmountTotal(safeAmountTotal);
        self.selectedContractsSummary.amountTotal(amountTotal);
        self.selectedContractsSummary.basisWeightTotal(basisWeightTotal);
        self.selectedContractsSummary.safeWeightTotal(safeWeightTotal);
        self.selectedContractsSummary.weightTotal(weightTotal);
    };


    function _search(params) {
        utils.responseStateChange(false);

        base._get(route.listUrl, params, function (result) {
            _fill(result);
        });
    };

    function _fill(result) {
        var data = result.data.data;
        if (data != null) {
            $.each(data, function (i, item) {
                if (item.commodities != null && item.commodities.length > 1) {
                    for (var j = 0; j < item.commodities.length; j++) {
                        if (item.commodities[j].id != commonModels.AllCommodities[j].id) {
                            var temp = item.commodities[j];
                            var actualIndex = -1;

                            $.each(commonModels.AllCommodities, function (k, comm) {
                                if (comm.id == item.commodities[j].id) {
                                    actualIndex = k;
                                    return;
                                }
                            });

                            if (actualIndex >= 0) {
                                item.commodities[j] = item.commodities[actualIndex];
                                item.commodities[actualIndex] = temp;
                            }
                        }
                    }
                }
            });
        }

        if (self.query.CommodityId() == null) {
            self.availableCommodity(commonModels.AllCommodities);
            $.each(data, function (j, comm) {
                comm.availableCommodities = comm.commodities;
            });
        } else {
            var comms = $.grep(commonModels.AllCommodities, function (r) {
                return r.id == self.query.CommodityId();
            });
            self.availableCommodity(comms);
            $.each(data, function (j, comm) {
                comm.availableCommodities = $.grep(comm.commodities, function (r) {
                    return r.id == self.query.CommodityId();
                });
            });
        }

        self.items(data);

        self.pageSummary.count(data.length);
        var companyTotalAmount = 0;
        var companyActualTotalAmount = 0;
        var companyOverTotalAmount = 0;
        var groupTotalAmount = 0;
        var groupActualTotalAmount = 0;
        var groupOverTotalAmount = 0;

        var commoditiesSummary = [];
        $.each(self.availableCommodity(), function (i, comm) {
            var commSummary = {
                commodityId: comm.id || '',
                commodityTotalAmount: 0,
                commodityActualTotalAmount: 0,
                commodityOverTotalAmount: 0
            };
            commoditiesSummary.push(commSummary);
        });

        $.each(self.items(), function (i, item) {
            companyTotalAmount += item.company.amountQuota;
            companyActualTotalAmount += item.company.actualAmount;
            companyOverTotalAmount += Math.max((item.company.actualAmount || 0) - (item.company.amountQuota == null ? Number.MAX_VALUE : item.company.amountQuota), 0);

            $.each(item.commodities, function (j, comm) {
                var commodities = $.grep(commoditiesSummary, function (r) {
                    return comm.id == r.commodityId;
                });
                if (commodities != null && commodities.length == 1) {
                    commodities[0].commodityTotalAmount += comm.amountQuota;
                    commodities[0].commodityActualTotalAmount += comm.actualAmount;
                    commodities[0].commodityOverTotalAmount += Math.max((comm.actualAmount || 0) - (comm.amountQuota == null ? Number.MAX_VALUE : comm.amountQuota), 0);
                }
            });
        });

        self.pageSummary.companyTotalAmount(companyTotalAmount);
        self.pageSummary.companyActualTotalAmount(companyActualTotalAmount);
        self.pageSummary.companyOverTotalAmount(companyOverTotalAmount);
        self.pageSummary.commoditiesSummary(commoditiesSummary);

        var summary = result.data.summary;
        self.totalSummary.count(summary.count);
        self.totalSummary.companyTotalAmount(summary.totalAmount);
        self.totalSummary.companyActualTotalAmount(summary.actualTotalAmount);
        self.totalSummary.companyOverTotalAmount(summary.totalOverAmount);

        var totalCommoditiesSummary = [];
        $.each(self.availableCommodity(), function (i, comm) {

            var commSummary = $.grep(summary.creditRiskReportSummariesByCommodity, function (r) {
                return r.commodityId == comm.id;
            });

            var commoditySummary = {
                commodityId: comm.id || '',
                commodityTotalAmount: commSummary.length > 0 ? commSummary[0].totalAmount : 0,
                commodityActualTotalAmount: commSummary.length > 0 ? commSummary[0].actualTotalAmount : 0,
                commodityOverTotalAmount: commSummary.length > 0 ? commSummary[0].totalOverAmount : 0
            };
            totalCommoditiesSummary.push(commoditySummary);
        });
        self.totalSummary.commoditiesSummary(totalCommoditiesSummary);

        base._p(result.data.pagination, route.listUrl, _fill, function () {
            return ko.mapping.toJS(self.query);
        });
        utils.responseStateChange();

        if (self.items().length === 0 && self.query.CompanyId() != null) {
            self.errorMsg.show(true);
        } else
            self.errorMsg.show(false);

    };
};

//contract risk info
GMK.Report.ContractRiskRecords = function (commonModels, route,options) {
    this.commonModels = commonModels;
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.selectedContracts = ko.observableArray();
    self.selectedContractsSummary = {
        basisAmountTotal: ko.observable(),
        safeAmountTotal: ko.observable(),
        amountTotal: ko.observable(),
        basisWeightTotal: ko.observable(),
        safeWeightTotal: ko.observable(),
        weightTotal: ko.observable()
    };
    self.selectedCompany = ko.observable();
    self.selectedCommodity = ko.observable();
    self.selectedIsBuy = ko.observable();
    self.pageSummary = {
        count: ko.observable(),
        companyTotalAmount: ko.observable(),
        companyActualTotalAmount: ko.observable(),
        companyOverTotalAmount: ko.observable(),
        commoditiesSummary: ko.observableArray()
    };

    self.initialize = function () {
        _search();
    };
    self.onShowContracts = function (company, item) {
        self.selectedCommodity(item.name);
        self.selectedCompany(company.name);
        self.selectedIsBuy(company.isBuy);
        self.selectedContracts(item.contracts);
        var basisAmountTotal = 0;
        var safeAmountTotal = 0;
        var amountTotal = 0;
        var basisWeightTotal = 0;
        var safeWeightTotal = 0;
        var weightTotal = 0;
        $.each(item.contracts, function (i, detail) {
            basisAmountTotal += detail.basisAmount;
            safeAmountTotal += detail.safeAmount;
            amountTotal += detail.amount;
            basisWeightTotal += detail.basisWeight;
            safeWeightTotal += detail.safeWeight;
            weightTotal += detail.weight;
        });

        self.selectedContractsSummary.basisAmountTotal(basisAmountTotal);
        self.selectedContractsSummary.safeAmountTotal(safeAmountTotal);
        self.selectedContractsSummary.amountTotal(amountTotal);
        self.selectedContractsSummary.basisWeightTotal(basisWeightTotal);
        self.selectedContractsSummary.safeWeightTotal(safeWeightTotal);
        self.selectedContractsSummary.weightTotal(weightTotal);
    };


    function _search() {
        base._get(route.listUrl, { key: options.key}, function (result) {
            _fill(result);
        });
    };

    function _fill(result) {
        var data = result.data.data;
        if (data != null) {
            $.each(data, function (i, item) {
                if (item.commodities != null && item.commodities.length > 1) {
                    for (var j = 0; j < item.commodities.length; j++) {
                        if (item.commodities[j].id != commonModels.AllCommodities[j].id) {
                            var temp = item.commodities[j];
                            var actualIndex = -1;

                            $.each(commonModels.AllCommodities, function (k, comm) {
                                if (comm.id == item.commodities[j].id) {
                                    actualIndex = k;
                                    return;
                                }
                            });

                            if (actualIndex >= 0) {
                                item.commodities[j] = item.commodities[actualIndex];
                                item.commodities[actualIndex] = temp;
                            }
                        }
                    }
                }
            });
        }

        self.items(data);

        self.pageSummary.count(data.length);
        var companyTotalAmount = 0;
        var companyActualTotalAmount = 0;
        var companyOverTotalAmount = 0;
        var groupTotalAmount = 0;
        var groupActualTotalAmount = 0;
        var groupOverTotalAmount = 0;

        var commoditiesSummary = [];
        $.each(commonModels.AllCommodities, function (i, comm) {
            var commSummary = {
                commodityId: comm.id || '',
                commodityTotalAmount: 0,
                commodityActualTotalAmount: 0,
                commodityOverTotalAmount: 0
            };
            commoditiesSummary.push(commSummary);            
        });

        $.each(self.items(), function (i, item) {
            companyTotalAmount += item.company.amountQuota;
            companyActualTotalAmount += item.company.actualAmount;
            companyOverTotalAmount += Math.max((item.company.actualAmount || 0) - (item.company.amountQuota == null ? Number.MAX_VALUE : item.company.amountQuota), 0);

            $.each(item.commodities, function (j, comm) {
                var commodities = $.grep(commoditiesSummary, function (r) {
                    return comm.id == r.commodityId;
                });
                if (commodities != null && commodities.length == 1) {
                    commodities[0].commodityTotalAmount += comm.amountQuota;
                    commodities[0].commodityActualTotalAmount += comm.actualAmount;
                    commodities[0].commodityOverTotalAmount += Math.max((comm.actualAmount || 0) - (comm.amountQuota == null ? Number.MAX_VALUE : comm.amountQuota), 0);
                }
            });

        });

        self.pageSummary.companyTotalAmount(companyTotalAmount);
        self.pageSummary.companyActualTotalAmount(companyActualTotalAmount);
        self.pageSummary.companyOverTotalAmount(companyOverTotalAmount);
        self.pageSummary.commoditiesSummary(commoditiesSummary);

    };
}