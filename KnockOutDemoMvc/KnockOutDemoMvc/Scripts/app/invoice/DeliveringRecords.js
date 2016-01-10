/**
 * User: dawson.liu
 * Date: 13-9-22
 * Time: 上午10:10
 */

var GMK = GMK || {};
GMK.Invoice = GMK.Invoice || {};
GMK.Invoice.DeliveringRecords = GMK.Invoice.DeliveringRecords || {};

GMK.Invoice.DeliveringRecords.start = function (route, element, success) {
    var $routeElem = $("#gmk-route"), rtad = {
        baseUrl: 'Invoice/',
        action: $routeElem.data("action"),
        invoiceRequestId: $routeElem.data('invoice-request-id')
    };

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = null;
        if (rtad.action == 'List') {
            viewModel = new GMK.Invoice.DeliveringRecords.ListViewModel(models, {
                invoiceRequestId: rtad.invoiceRequestId,
                searchUrl: rtad.baseUrl + 'ListInvoiceRecords',
                detailUrl: rtad.baseUrl + 'GetInvoiceRecord',
                deleteUrl: rtad.baseUrl + 'DeleteInvoiceRecord'
            });
        } else if (rtad.action == 'Manage') {
            viewModel = new GMK.Invoice.DeliveringRecords.ManageViewModel(models, route, {
                loadRequestUrl: rtad.baseUrl + 'LoadInvoiceRequestWithContracts',
                loadUrl: rtad.baseUrl + 'GetInvoiceRecord',
                saveUrl: rtad.baseUrl + 'SaveInvoiceRecord',
                listUrl: rtad.baseUrl + 'DeliveringRecords'
            });
        } else if (rtad.action == 'Detail') {
            viewModel = new GMK.Invoice.DeliveringRecords.DetailViewModel(models, {
                loadRequestUrl: rtad.baseUrl + 'LoadInvoiceRequestWithContracts',
                loadUrl: rtad.baseUrl + 'GetInvoiceRecord'
            });
        }
        window.vm = viewModel;
        if (viewModel) {
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            if (rtad.action == 'List') {
                function initialize(query) {
                    utils.deserialize('#searchForm .gmk-data-field', query);
                    viewModel.initialize(query);
                }
                utils.responseStateChange();
                initialize(models.getQuery());
                models.registerStateChange(initialize);
            } else {
                viewModel.initialize();
            }
        }
    });
};

GMK.Invoice.DeliveringRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    var pagination;
    function viewModel() {
        var vm = this;
        vm.contractCode = ko.observable();
        vm.recordList = ko.observableArray();
        vm.recordDetails = ko.observable();
        vm.pageSummary = {
            Weight: ko.computed(function () {
                var sum = 0;
                $.each(vm.recordList(), function (i, r) {
                    sum = utils.roundWeight(sum + utils.roundWeight(r.TotalWeight));
                });
                return sum;
            }),
            Amount: ko.computed(function () {
                var sum = 0;
                $.each(vm.recordList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.TotalAmount));
                });
                return sum;
            })
        };
        vm.searchSummary = ko.observable({});
        vm.fill = function (result) {
            vm.recordList(result.Data.list);
            vm.searchSummary(result.Data.summary);
            pagination = result.Data.pagination;
            base._paginate($('#gmk-pager'), result.Data.pagination, function () {
                return $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: false });
            }, options.searchUrl, vm.fill);
        };
        vm.fillDetail = function (data) {
            vm.recordDetails.removeAll();
            $.each(data.WFContractInvoices, function (i, item) {
                vm.recordDetails.push(item);
            });
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        _search();
    };

    function _search(withPagination) {
        utils.responseStateChange(false);
        var param = $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: false });
        if (withPagination) param.pagination = pagination;
        base._get(options.searchUrl, param, function (data) {
            self.fill(data);
        }, true);
    }

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFInvoiceRecordId }, function () {
            if (options.invoiceRequestId) {
                base._get(options.searchUrl, { IsReceive: false, InvoiceRequestId: options.invoiceRequestId }, function (list) {
                    self.fill(list);
                });
            } else {
                _search(true);
            }
        });
    };

    self.onShowDetail = function (item, event) {
        base._get(options.detailUrl, { id: item.WFInvoiceRecordId }, null, function (data) {
            vm.fillDetail(data);
        });
    };

    self.initialize = function (query) {
        base._get(options.searchUrl, $.extend(query, { IsReceive: false, InvoiceRequestId: options.invoiceRequestId }), function (list) {
            self.fill(list);
        }, true);
    }
};

GMK.Invoice.DeliveringRecords.ManageViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.values = route.values;
    function viewModel() {
        var vm = this;
        vm.request = ko.observable();
        vm.requestBank = ko.observable();
        vm.contractList = ko.observableArray();
        vm.totalAmount = ko.computed(function () {
            var result = { TotalAmount: 0, TotalWeight: 0 };
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes, function (j, d) {
                    result.TotalAmount = utils.roundAmount(result.TotalAmount + (d.isDetailSelected() ? utils.roundAmount(d.Amount()) : 0));
                    result.TotalWeight = utils.roundAmount(result.TotalWeight + (d.isDetailSelected() ? utils.roundAmount(d.Weight(), 4) : 0), 4);
                });
            });
            result.TotalAmount = result.TotalAmount;
            result.TotalWeight = result.TotalWeight;
            return result;
        });
        var today = moment(0, 'HH').toJSON();
        vm.OpenDate = ko.observable(today);
        vm.DeliveryDate = ko.observable(today);
        vm.toJson = function () {
            var contractInvoices = [];
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes, function (j, d) {
                    if (d.isDetailSelected()) {
                        d.CommodityId = item.CommodityId;
                        contractInvoices.push($.extend({}, route.values.newDetail, d, true));
                    }
                });
            });

            var formData = utils.serialize('#expressForm .gmk-data-field');
            var invoiceRecord = ko.toJS($.extend({}, route.values.newItem, vm.totalAmount(), formData, {
                WFInvoiceRequestId: vm.request().WFInvoiceRequestId,
                IsReceive: false,
                WFContractInvoices: contractInvoices,
                WFInvoiceRecordId: self.key || '0',
                CustomerId: vm.request().CustomerId,
                OpenDate: vm.OpenDate(),
                DeliveryDate: vm.DeliveryDate(),
                CurrencyId:vm.request().CurrencyId,
            }, true));
            function clear(target, tm) {
                for (var p in target) {
                    if (tm[p] === undefined) {
                        delete target[p];
                    }
                }
            }
            clear(invoiceRecord, route.values.newItem);
            $.each(invoiceRecord.WFContractInvoices, function (i,r) {
                clear(r, route.values.newDetail);
            });
            return invoiceRecord;
        };
        vm.fillRequest = function (data, defaultSelected) {
            vm.requestBank(self.findBank(data.request.CustomerBankId, data.request.CustomerId));
            vm.request(data.request);
            $.each(data.contracts, function (i, item) {
                $.each(data.request.WFInvoiceRequestDetails, function (k, requestDetail) {
                    $.each(item.WFContractDetailInfoes, function (j, d) {
                        if (requestDetail.WFContractDetailInfoId == d.WFContractDetailInfoId) {
                            if (ko.isObservable(d.isDetailSelected)) {
                                d = ko.mapping.toJS(d);
                                item.WFContractDetailInfoes.splice(j + 1, 0, d);
                            }
                            d.isDetailSelected = ko.observable(defaultSelected);
                            d.Weight = ko.observable(requestDetail.Weight);
                            d.Amount = ko.observable(requestDetail.Amount);
                            d.Price = requestDetail.Price;
                            d.Note = ko.observable();
                            d.TaxRate = ko.observable(requestDetail.TaxRate);
                            d.Taxation = ko.observable(requestDetail.Taxation);
                            return false;
                        }
                    });
                });
                vm.contractList.push(item);
            });
        };
        vm.fillRecord = function (data) {
            vm.OpenDate(data.OpenDate);
            vm.DeliveryDate(data.DeliveryDate);
            utils.deserialize('#expressForm .gmk-data-field', data);

            $.each(data.WFContractInvoices, function (i, item) {
                $.each(vm.contractList(), function (j, c) {
                    $.each(c.WFContractDetailInfoes, function (k, detail) {
                        if (detail.WFContractDetailInfoId == item.WFContractDetailInfoId &&
                            item.Weight == detail.Weight() && item.Amount == detail.Amount() && item.TaxRate == detail.TaxRate() && item.Taxation == detail.Taxation()) {
                            detail.isDetailSelected(true);
                            detail.Note(item.Note);
                            return false;
                        }
                    });
                });
            });
        };
    }
    viewModel.call(this);

    self.onSave = function () {
        base._saveThenBack(options.saveUrl, self.toJson());
    };

    self.initialize = function () {
        var url = $.url(); // parse the current page URL using jQuery plug in(https://github.com/allmarkedup/purl)
        self.key = url.param('id');
        if (url.param('requestId')) {
            base._get(options.loadRequestUrl, { requestId: url.param('requestId') }, function (data) {
                self.fillRequest(data, !url.param('id'));

                if (url.param('id')) {
                    base._get(options.loadUrl, { id: url.param('id') }, function (data) {
                        self.fillRecord(data);
                    }, true);
                }
            }, true);
        }
    }
}

GMK.Invoice.DeliveringRecords.DetailViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.request = ko.observable();
        vm.record = ko.observable();
        vm.requestBank = ko.observable();
        vm.contractList = ko.observableArray();
        vm.totalAmount = ko.computed(function () {
            var result = { TotalAmount: 0, TotalWeight: 0 };
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes, function (j, d) {
                    result.TotalAmount += item.isVisible() ? parseFloat(d.Amount()) : 0;
                    result.TotalWeight += item.isVisible() ? parseFloat(d.Weight()) : 0;
                });
            });
            result.TotalAmount = utils.formatDecimal(result.TotalAmount, vm.settings.decimalDigits);
            result.TotalWeight = utils.formatDecimal(result.TotalWeight, vm.settings.weightDigits);
            return result;
        });

        vm.fillRequest = function (data, defaultSelected) {
            vm.requestBank(self.findBank(data.request.CustomerBankId, data.request.CustomerId));
            vm.request(data.request);
            $.each(data.contracts, function (i, item) {
                item.isVisible = ko.observable(false);

                $.each(data.request.WFInvoiceRequestDetails, function (k, requestDetail) {
                    $.each(item.WFContractDetailInfoes, function (j, d) {
                        if (requestDetail.WFContractDetailInfoId == d.WFContractDetailInfoId) {
                            if (ko.isObservable(d.Weight)) {
                                d = ko.mapping.toJS(d);
                                item.WFContractDetailInfoes.splice(j + 1, 0, d);
                            }
                            d.Weight = ko.observable(requestDetail.Weight);
                            d.Amount = ko.observable(requestDetail.Amount);
                            d.Price = requestDetail.Price;
                            d.Note = ko.observable();
                            d.TaxRate = ko.observable(requestDetail.TaxRate);
                            d.Taxation = ko.observable(requestDetail.Taxation);
                            return false;
                        }
                    });
                });
                vm.contractList.push(item);
            });
        };
        vm.fillRecord = function (data) {
            vm.record(data);

            $.each(data.WFContractInvoices, function (i, item) {
                $.each(vm.contractList(), function (j, c) {
                    $.each(c.WFContractDetailInfoes, function (k, detail) {
                        if (detail.WFContractDetailInfoId == item.WFContractDetailInfoId &&
                            item.Weight == detail.Weight() && item.Amount == detail.Amount() && item.TaxRate == detail.TaxRate() && item.Taxation == detail.Taxation()) {
                            c.isVisible(true);
                            detail.Note(item.Note);
                            return false;
                        }
                    });
                });
            });
        };
    }
    viewModel.call(this);

    self.initialize = function () {
        var url = $.url(); // parse the current page URL using jQuery plug in(https://github.com/allmarkedup/purl)
        if (url.param('requestId')) {
            base._get(options.loadRequestUrl, { requestId: url.param('requestId') }, function (data) {
                self.fillRequest(data, !url.param('id'));

                if (url.param('id')) {
                    base._get(options.loadUrl, { id: url.param('id') }, function (data) {
                        self.fillRecord(data);
                    }, true);
                }
            }, true);
        }
    }
}

