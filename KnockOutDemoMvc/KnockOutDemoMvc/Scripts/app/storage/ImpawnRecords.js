/**
 * Created by dawson.liu on 13-9-10.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.ImpawnRecords = GMK.Storage.ImpawnRecords || {};

GMK.Storage.ImpawnRecords.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.Storage.ImpawnRecords.ManageViewModel(models, {
                searchUrl: 'Storage/ListReceipts',
                listUrl: 'Storage/ImpawnRecords',
                getUrl: 'Storage/GetImpawnRecord',
                saveUrl: 'Storage/SaveImpawnRecord',
                id: url.param('id')
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else {
            models.registerQueryFormEvent();
            var viewModel = new GMK.Storage.ImpawnRecords.ListViewModel(models, {
                searchUrl: 'Storage/ListImpawnRecords',
                deleteUrl: 'Storage/DeleteImpawnRecord'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.onSearch();
        }
    });
};

GMK.Storage.ImpawnRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.currentWeights = ko.observable();
        vm.list.subscribe(function () {
            var w = 0;
            $.each(vm.list(), function (i, item) {
                w += utils.parseFloat(item.TotalWeight);
            });
            vm.currentWeights(w);
        });
        vm.totalCount = ko.observable();
        vm.totalWeights = ko.observable();
        vm.fill = function (data) {
            vm.list(data.Data.result);
            vm.totalCount(data.Data.summary.TotalCount);
            vm.totalWeights(data.Data.summary.TotalWeight);
            base._p(data.Data.pagination, options.searchUrl, vm.fill);
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFPledgeInfoId }, function () {
            self.list.remove(item);
        });
    };

    self.initialize = function () {
    };
}

GMK.Storage.ImpawnRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        var banks = [];
        $.each(models.AllCustomers, function (i, item) {
            if (self.isBank(item.type)) {
                banks.push(item);
            }
        });

        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    for (var j = 0; j < commodity.brands.length; j++) {
                        vm.brands.push(commodity.brands[j])
                    }
                    for (var j = 0; j < commodity.specifications.length; j++) {
                        vm.specifications.push(commodity.specifications[j])
                    }
                }
            }
        });
        vm.selectedWarehouseId = ko.observable(models.AllWarehouses[0].id);
        vm.selectedCustomer = ko.observable();
        vm.selectedCustomer.subscribe(function (newVal) {
            if (vm.selectedPledgeType() == 0) return;
            if (!newVal) {
                vm.pledgeInterestRate('');
                vm.PledgeRate('');
                return;
            }
            var customer = $.grep(vm.customers(), function (item) {
                return item.id == newVal;
            })[0];
            vm.pledgeInterestRate(customer.pledgeInterestRate);
            vm.PledgeRate(customer.pledgeRate);
        });
        vm.customers = ko.observableArray();
        vm.pledgeTypes = ko.observableArray([{ name: '所内质押', id: 0 }, { name: '所外质押', id: 1 }]);
        vm.selectedPledgeType = ko.observable();
        function _changeCustomers(pledgeType, exchangeId) {
            var temp;
            if (pledgeType == 0) {
                if (!exchangeId) {
                    vm.customers([]);
                } else if (models.isSpecialReceiptExchange(exchangeId)) {
                    temp = $.grep(models._AllExchanges, function (item) {
                        return item.id == exchangeId;
                    });
                    vm.customers(temp);
                    vm.selectedCustomer(temp[0].id);
                }
                else {
                    vm.customers(models._AllBrokers);
                    vm.selectedCustomer(null);
                }
            } else {
                vm.customers(banks);
                vm.selectedCustomer(null);
            }
        }
        vm.selectedPledgeType.subscribe(function (val) {
            vm.selectedExchange(null);
            _changeCustomers(val, vm.selectedExchange());
        });
        vm.selectedExchange = ko.observable();
        vm.selectedExchange.subscribe(function (newVal) {
            if (vm.selectedPledgeType() == 1) return;
            _changeCustomers(vm.selectedPledgeType(), newVal);
            if (!newVal) {
                vm.pledgeInterestRate('');
                vm.PledgeRate('');
                return;
            }
            var exchange = $.grep(models._AllExchanges, function (item) {
                return item.id == newVal;
            })[0];
            vm.pledgeInterestRate(exchange.pledgeInterestRate);
            vm.PledgeRate(exchange.pledgeRate);
        });
        vm.WFWarehouseStorageIds = [];
        vm.receiptList = ko.observableArray();
        vm.selectedWeight = ko.observable(0);
        vm.selectedCount = ko.computed(function () {
            var count = 0, weight = 0;
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) { count++; weight += item.Weight }
            });
            vm.selectedWeight(parseFloat(weight.toFixed(6)));
            return count;
        });
        vm.Price = ko.observable();
        vm.PledgeRate = ko.observable();
        vm.pledgeInterestRate = ko.observable();
        vm.PledgeAmount = ko.computed(function () {
            return parseFloat((vm.selectedWeight() * parseFloat(vm.Price()) * parseFloat(vm.PledgeRate()) || 0).toFixed(2));
        });
        vm.isSpecial = ko.observable(false);
        vm.toJson = function () {
            var pledgeInfo = utils.serialize("#mainForm .gmk-data-field");
            if (pledgeInfo.PledgeType == 1) pledgeInfo.ExchangeId = null;
            var storageFlowTracks = [];
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) {
                    storageFlowTracks.push({
                        SourceWarehouseStorageId: item.WFWarehouseStorageId
                    });
                }
            });
            pledgeInfo.WFPledgeInfoId = options.id;
            pledgeInfo.CommodityId = vm.selectedCommodity();
            pledgeInfo.WFWhStorageFlowTracks = storageFlowTracks;
            pledgeInfo.TradeType = vm.tradeType;
            return pledgeInfo;
        }
        vm.fill = function (data) {
            utils.deserialize("#mainForm .gmk-data-field", data.PledgeInfo);
            vm.selectedCustomer(null);// TODO:view model and html are not synced.
            vm.selectedCustomer(data.PledgeInfo.CustomerId);
            vm.pledgeInterestRate(data.PledgeInfo.PledgeInterestRate);
            vm.PledgeRate(data.PledgeInfo.PledgeRate);
            vm.selectedCommodity(data.PledgeInfo.CommodityId);
            vm.tradeType = data.PledgeInfo.TradeType; // Or using a hidden element in the cshtml?
            vm.receiptList.removeAll();

            $.each(data.WarehouseStorages, function (i, item) {
                item.isSelected = ko.observable(true);
                vm.receiptList.push(item);
            });
            vm.isSpecial(_isSpecial());
        }
        vm.fillReceiptList = function (data) {
            vm.receiptList.removeAll();
            var newData = [];
            $.each(self.cacheWarehouseStorages || [], function (i, item) {
                item.isSelected = ko.observable(true);
                newData.push(item);
            });
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(false);
                newData.push(item);
            });
            vm.receiptList(newData);
        };
    }

    viewModel.call(this);
    ko.SlimCheckExtension.call(this, this.receiptList);

    function _isSpecial() {
        return self.isSpecialReceiptExchange(self.selectedCustomer()) && (
            ($.grep(self.AllCommodities, function (item) { return item.id == self.selectedCommodity() })[0] || {}).measureType == self.Enums.CommodityMeasureType.ByPiece);
    }

    self.onSearch = function () {
        self.isSpecial(_isSpecial());
        var param = utils.serialize("#searchFrom .gmk-data-field");
        if (self.selectedPledgeType() == 0) param.ExchangeId = self.selectedExchange();
        base._get(options.searchUrl, param, function (data) {
            self.fillReceiptList(data);
        });
    };

    self.onSave = function () {
        var result = true, pledgeStartDate = moment($('#PledgeStartDate').val(), 'YYYY-MM-DD').toDate(), maxDate;
        $.each(self.receiptList(), function (i, item) {
            if (item.isSelected() && (!maxDate || maxDate.valueOf() < new Date(item.ActualEntryTime).valueOf())) maxDate = new Date(item.ActualEntryTime);
        });
        if (pledgeStartDate.valueOf() < maxDate.valueOf()) {
            alert('质押日期必须晚于所选质押仓单的最大入库日期'+moment(maxDate).format('YYYY-MM-DD'));
            return;
        }
        base._saveThenBack(options.saveUrl, self.toJson());
    };

    self.initialize = function () {
        if (options.id) {
            base._get(options.getUrl, { id: options.id }, function (data) {
                self.WFWarehouseStorageIds = [];
                self.cacheWarehouseStorages = data.WarehouseStorages;
                $.each(data.WarehouseStorages, function (i, item) {
                    self.WFWarehouseStorageIds.push(item.WFWarehouseStorageId);
                });
                self.fill(data);
            }, true);
        }
    };
    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
}

$(document).ready(function () {
    GMK.Storage.ImpawnRecords.start();
});