/**
 * Created by dawson.liu on 13-10-10.
 */

var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'ByCustomer') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.Report.ByCustomerViewModel(commonModels, route, {});
        }
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            if (success) {
                success(viewModel);
            }
        });
    });
};
GMK.Report.ByCustomerViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.query = {};
    (function (query) {
        function flagsToNum(flags) {
            return _.reduce(flags || [], function (m, r) {
                return m | r;
            }, 0) || null;
        }
        function numToFlags(num, allFlags) {
            return $.grep(allFlags, function (r) {
                return r & num;
            });
        }
        function getOFlags(oNum, allFlags) {
            return ko.computed({
                read: function () {
                    return numToFlags(oNum(), $.map(allFlags, function (r) {
                        return r.value;
                    }));
                },
                write: function (newVal) {
                    var current = oNum(),
                        valueToWrite = flagsToNum(newVal);
                    if (valueToWrite !== current) {
                        oNum(valueToWrite);
                    }
                }
            });
        }
        query.ContractCommodityStatus = getOFlags(self.toquery.StatusOfCommodity, commonModels.EnumOptions.ContractCommodityStatus);
        query.ContractAmountStatus = getOFlags(self.toquery.StatusOfAmount, commonModels.EnumOptions.ContractAmountStatus);
        query.ContractInvoiceStatus = getOFlags(self.toquery.StatusOfInvoice, commonModels.EnumOptions.ContractInvoiceStatus);
    })(self.query);
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams, true);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.resultSummary = ko.observable({});
    self.pageSummary = ko.computed(function () {
        return _.reduce(self.items(), function (m, r) {
            m.Weight = utils.roundWeight(m.Weight + (r.IsBuy ? -1 : 1) * utils.roundWeight(r.Weight));
            m.CommodityHappened = utils.roundWeight(m.CommodityHappened + (r.IsBuy ? -1 : 1) * utils.roundWeight(r.CommodityHappened));
            m.AmountActualTotal = utils.roundAmount(m.AmountActualTotal + (r.IsBuy ? -1 : 1) * utils.roundAmount(r.AmountActualTotal));
            m.AmountHappened = utils.roundAmount(m.AmountHappened + (r.IsBuy ? -1 : 1) * utils.roundAmount(r.AmountHappened));
            m.SettlementAmount = utils.roundAmount(m.SettlementAmount + (r.IsBuy ? -1 : 1) * utils.roundAmount(r.SettlementAmount));
            m.InvoiceHappened = utils.roundAmount(m.InvoiceHappened + (r.IsBuy ? -1 : 1) * utils.roundAmount(r.InvoiceHappened));
            m.InvoiceUnhappened = utils.roundAmount(m.InvoiceUnhappened + (r.IsBuy ? -1 : 1) * (utils.roundAmount(r.AmountActualTotal) - utils.roundAmount(r.InvoiceHappened)));
            return m;
        }, {
            Weight: 0,
            CommodityHappened: 0,
            AmountActualTotal: 0,
            AmountHappened: 0,
            SettlementAmount: 0,
            InvoiceHappened: 0,
            InvoiceUnhappened: 0
        });
    });
    var expandingItem, $tableQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($tableQueryResult.expandable('instance')) $tableQueryResult.expandable('destroy');
        $tableQueryResult.expandable({
            toggleCallback: function (e) {
                $(e.target.closest('td').siblings('.showDetail')[0]).click();
                expandingItem = e.target;
            }
        });
    }
    self.search = function (params, callback) {
        base._get('Report/ListLedgerReport?' + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
            utils.autoFormatString();
            _initializeExpandable();
        });
    };
    self.fill = function (result) {
        var list = $.map(result.Data.list, function (r) {
            return $.extend(r, {
                details: ko.observableArray(r.WFContractDetailInfoes || []),
                isShowDetails: ko.observable(false)
            });
        });
        self.items(list);
        self.resultPagination(result.Data.pagination);
        self.resultSummary(result.Data.summary);
        base._pagination($("#pager"), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.queried().Pagination.PageSize);
    };
    self.changePage = function (newPage, pageSize) {
        var params = self.queried();
        var currPageSize = +self.toquery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.toquery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        self.search(params);
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.initialize = function (callback) {
        callback();
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.onExport = function () {
        utils.fileDownload(utils.urlAction('ExportLedger', 'Report', $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), {  })));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var urlParams = $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), { downloadToken: downloadToken });
        //    var url = utils.urlAction('ExportLedger', 'Report', urlParams);
        //    $form.attr('action', url);
        //    $form.empty();
        //});
    };
    self.onShowDetail = function (r) {
        //r.isShowDetails(!r.isShowDetails());
    };
};


//    self.beginConfirmReport = function (data, event) {
//        $('#confirmReportForm').modal('show');
//    };
//    self.endConfirmationReport = function (data, event) {
//        var dateRange = $('#DateRange').val().split(' - ');
//        base._post(options.confirmReportUrl, $.extend(utils.serialize('#confirmReportForm .gmk-data-field'), { 'startDate': dateRange[0], 'endDate': dateRange[1] }), function (result) {
//            if (result.Data) {
//                $(event.currentTarget).closest('.modal').modal('hide');
//            } else {
//                alert(result.Message);
//            }
//        });
//    };
