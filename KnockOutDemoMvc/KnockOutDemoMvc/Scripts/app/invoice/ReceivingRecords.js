/**
 * User: dawson.liu
 * Date: 13-9-23
 * Time: 上午10:10
 */

var GMK = GMK || {};
GMK.Invoice = GMK.Invoice || {};
GMK.Invoice.ReceivingRecords = GMK.Invoice.ReceivingRecords || {};

GMK.Invoice.ReceivingRecords.start = function () {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Invoice/',
        action: $routeElem.data("action"),
        contractId: $routeElem.data("contractid")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = null;
        if (route.action == 'List') {
            viewModel = new GMK.Invoice.ReceivingRecords.ListViewModel(models, {
                contractId: route.contractId,
                searchUrl: route.baseUrl + 'ListInvoiceRecords',
                detailUrl: route.baseUrl + 'GetReceivingRecord',
                deleteUrl: route.baseUrl + 'DeleteInvoiceRecord'
            });
            ko.applyBindings(viewModel);

            function initialize(query) {
                utils.deserialize('#searchForm .gmk-data-field', query);
                viewModel.initialize(query);
            }
            utils.responseStateChange();
            initialize(models.getQuery());
            models.registerStateChange(initialize);
        } else if (route.action == 'Manage') {
            viewModel = new GMK.Invoice.ReceivingRecords.ManageViewModel(models, {
                loadInvoiceSummariesUrl: route.baseUrl + 'ListInvoiceSummaries',
                loadCustomerWithContractDetailsUrl: route.baseUrl + 'LoadContractDetailsForInvoice',
                loadUrl: route.baseUrl + 'GetInvoiceRecord',
                saveUrl: route.baseUrl + 'SaveInvoiceRecord',
                listUrl: route.baseUrl + 'ReceivingRecords',
                $fillTab: $('#record a:last')
            });
            ko.applyBindings(viewModel);
            viewModel.initialize();
        } else if (route.action == 'Detail') {
            viewModel = new GMK.Invoice.ReceivingRecords.DetailViewModel(models, {
                loadCustomerWithContractDetailsUrl: route.baseUrl + 'LoadContractDetailsForInvoice',
                loadUrl: route.baseUrl + 'GetInvoiceRecord'
            });
            ko.applyBindings(viewModel);
            viewModel.initialize();
        }

    });
};

GMK.Invoice.ReceivingRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contractCode = ko.observable(options.contractCode);
        vm.contractId = ko.observable(options.contractId);
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
            base._paginate($('#gmk-pager'), result.Data.pagination, function () {
                return $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: true });
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
        utils.responseStateChange(false);
        base._get(options.searchUrl, $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: true }), function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFInvoiceRecordId }, function () {
            var $elem = $(event.currentTarget).closest('tr');
            if ($elem) {
                $elem.remove();
            }
        });
    };

    self.onShowDetail = function (item, event) {
        base._get(options.detailUrl, { id: item.WFInvoiceRecordId }, null, function (data) {
            vm.fillDetail(data);
        });
    };

    self.initialize = function (query) {
        base._get(options.searchUrl, $.extend(query, { IsReceive: true }), function (list) {
            self.fill(list);
        }, true);
    }
};

GMK.Invoice.ReceivingRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function extendContractDetailViewModel(vm) {
        var oWeight = parseFloat(vm.ActualWeight ? vm.ActualWeight : vm.Weight) || 0;
        var oPrice = parseFloat(vm.ActualPrice ? vm.ActualPrice : vm.Price) || 0;
        var oAmount = parseFloat(vm.UnHappenedInvoiceAmount) || 0;
        delete vm.Weight;
        delete vm.Amount;

        vm.isDetailSelected = ko.observable(false);
        vm.Weight = ko.observable(utils.roundAmount(new BigDecimal(oWeight.toString()).subtract(new BigDecimal(vm.ReceivedInvoiceWeight.toString())).toString(), 4));
        vm.Amount = ko.observable(utils.roundAmount(oAmount));
        vm.Price = ko.observable(utils.roundAmount(vm.Weight() ? (vm.Amount() / vm.Weight()) : oPrice));
        vm.Note = ko.observable();        
        
        vm.TaxRate = ko.observable(0.17);
        vm.Taxation = ko.observable(utils.roundAmount(vm.Amount() / (1 + vm.TaxRate()) * vm.TaxRate()));
        
        vm.WeightComputed = ko.computed({
            read: vm.Weight,
            write: function (value) {
                var weight = utils.roundAmount(value, 4) || 0;
                vm.Weight(weight);
                var price = parseFloat(vm.Price()) || 0;
                var amount = utils.roundAmount(weight * price);
                vm.Amount(amount);
                var taxRate = parseFloat(vm.TaxRate()) || 0;
                var taxation = utils.roundAmount(amount / (1 + taxRate) * taxRate);
                vm.Taxation(taxation);
            }
        });
        vm.PriceComputed = ko.computed({
            read: vm.Price,
            write: function (value) {
                var price = parseFloat(value) || 0;
                vm.Price(price);
                var weight = utils.roundAmount(vm.Weight(), 4) || 0;
                var amount = utils.roundAmount(weight * price);
                vm.Amount(amount);
                var taxRate = parseFloat(vm.TaxRate()) || 0;
                var taxation = utils.roundAmount(amount / (1 + taxRate) * taxRate);
                vm.Taxation(taxation);
            }
        });
        vm.AmountComputed = ko.computed({
            read: vm.Amount,
            write: function (value) {
                var amount = utils.roundAmount(value) || 0;
                vm.Amount(amount);
                var weight = utils.roundAmount(vm.Weight(), 4) || 0;
                if (weight != 0) {
                    var price = parseFloat((amount / weight).toFixed(2));
                    vm.Price(price);
                }
                var taxRate = parseFloat(vm.TaxRate()) || 0;
                var taxation = utils.roundAmount(amount / (1 + taxRate) * taxRate);
                vm.Taxation(taxation);
            }
        });
        vm.TaxRateComputed = ko.computed({
            read: function () {
                return 100 * vm.TaxRate();
            },
            write: function (value) {
                var taxRate = (value / 100) || 0;
                vm.TaxRate(taxRate);
                var amount = utils.roundAmount(vm.Amount()) || 0;
                var taxation = utils.roundAmount(amount / (1 + taxRate) * taxRate);
                vm.Taxation(taxation);
            }
        });

        vm.ContractWeight = ko.observable(oWeight);
        vm.OldWeight = ko.observable(0);
        vm.HadApplyWeight = ko.computed(function () {
            return utils.roundAmount(new BigDecimal(vm.ReceivedInvoiceWeight.toString())
                .subtract(new BigDecimal(vm.OldWeight().toString()))
                .add(new BigDecimal(vm.WeightComputed() ? vm.WeightComputed().toString() : "0")).toString(), 4);
        });
        vm.NotApplyWeight = ko.computed(function () {
            return utils.roundAmount(new BigDecimal(vm.ContractWeight().toString())
                .subtract(new BigDecimal(vm.HadApplyWeight().toString())).toString(), 4);
        });
    }

    function viewModel() {
        var vm = this;
        vm.invoiceSummaryList = ko.observableArray();
        vm.contractCode = ko.observable();
        vm.contractId = ko.observable();
        vm.customer = ko.observable();
        vm.request = ko.observable();
        vm.requestBank = ko.observable();
        vm.contractList = ko.observableArray();

        vm.currencyId = ko.observable(vm.AllCurrencies[0].id); //默认取人民币
        vm.allContractList = ko.observableArray();
        vm.currencyId.subscribe(function (newVal) {
            if (newVal) {
                var avilableList = $.grep(vm.allContractList(), function (r) {
                    return r.CurrencyId == vm.currencyId();
                });
                vm.contractList(avilableList);
                var $divQueryResult = $('#divQueryResult');
                if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
                $divQueryResult.expandable();
                options.$fillTab.tab('show');
            }
        });
        vm.currencyDisable = ko.observable(false);

        vm.totalAmount = ko.computed(function () {
            var result = { TotalAmount: 0, TotalWeight: 0 };
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes(), function (j, d) {
                    result.TotalAmount = utils.roundAmount(result.TotalAmount + (d.isDetailSelected() ? utils.roundAmount(d.Amount()) : 0));
                    result.TotalWeight = utils.roundAmount(result.TotalWeight + (d.isDetailSelected() ? utils.roundAmount(d.Weight(), 4) : 0), 4);
                });
            });
            result.TotalAmount = result.TotalAmount;
            result.TotalWeight = result.TotalWeight;
            return result;
        });
        vm.OpenDate = ko.observable();
        vm.ReceiveDate = ko.observable();
        vm.Note = ko.observable();

        vm.toJson = function () {
            var contractInvoices = [], contractCodes = [];
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes(), function (j, d) {
                    if (d.isDetailSelected()) {
                        if (Math.abs(utils.parseFloat(d.AmountComputed())) >= Math.Epsilon) {
                            d.CommodityId = item.CommodityId;
                            contractInvoices.push(d);
                        } else {
                            contractCodes.push(item.ContractCode);
                        }
                    }
                });
            });
            if (contractCodes.length) {
                alert('合同{0}下的明细没有填写收票金额'.format(contractCodes.join()));
                return;
            }
            if (!contractInvoices.length) {
                alert('请选择至少一条待收票的合同明细');
                return;
            }
            var formData = utils.serialize('#recordForm .gmk-data-field');
            var invoiceRecord = $.extend(vm.totalAmount(), formData, {
                WFContractInvoices: contractInvoices,
                OpenDate: vm.OpenDate(),
                ReceiveDate: vm.ReceiveDate(),
                Note: vm.Note(),
                IsReceive: true,
                CustomerId: vm.customer().WFCompanyId,
                WFInvoiceRecordId: self.key || '0',
                CurrencyId : self.currencyId(),
            });

            return invoiceRecord;
        };
        function _cloneContractDetail(item) {
            var result = ko.mapping.toJS(item);
            if (result.hasOwnProperty('ContractWeight')) result.Weight = result.ContractWeight;
            extendContractDetailViewModel(result);
            result.Amount(0);
            return result;
        }
        vm.onAddInvoiceDetail = function (item, event) {
            var cloned = _cloneContractDetail(item);
            this.WFContractDetailInfoes.splice(this.WFContractDetailInfoes.indexOf(item) + 1, 0, cloned);
            vm.totalAmount.peek();
            cloned.isDetailSelected(true);
            utils.formatDecimal();
            $('#divQueryResult').expandable('sync', $(event.currentTarget).closest('table').closest('tr'));
        };
        vm.onRemoveInvoiceDetail = function (item) {
            var $row = $(event.currentTarget).closest('table').closest('tr');
            this.WFContractDetailInfoes.remove(item);
            $('#divQueryResult').expandable('sync', $row);
        };
        vm.fillRecord = function (data) {
            utils.deserialize('#recordForm .gmk-data-field', data);
            vm.currencyId(data.CurrencyId);
            vm.currencyDisable(true);
            $.each(data.WFContractInvoices, function (i, item) {
                $.each(vm.contractList(), function (j, c) {
                    $.each(c.WFContractDetailInfoes(), function (k, detail) {
                        if (detail.WFContractDetailInfoId == item.WFContractDetailInfoId) {
                            if (detail.isDetailSelected()) {
                                detail = _cloneContractDetail(detail);
                                c.WFContractDetailInfoes.splice(k + 1, 0, detail);
                            }
                            detail.isDetailSelected(true);
                            detail.OldWeight(utils.roundAmount(item.Weight, 4));
                            detail.Weight(utils.roundAmount(item.Weight, 4));
                            detail.Price(item.Price);
                            detail.Amount(utils.roundAmount(item.Amount));
                            detail.TaxRate(item.TaxRate);
                            detail.Taxation(utils.roundAmount(item.Taxation));
                            detail.Note(item.Note);
                            return false;
                        }
                    });
                });
            });
        };
        vm.fillCustomerWithContractDetails = function (data) {
            vm.customer(data.customer);
            vm.contractList.removeAll();
            var list = [];
            $.each(data.contracts, function (i, item) {
                $.each(item.WFContractDetailInfoes, function (j, d) { extendContractDetailViewModel(d); });
                item.isAllDetailsSelected = ko.observable(false);
                item.isAllDetailsSelected.subscribe(function (newV) {
                    $.each(item.WFContractDetailInfoes(), function (k, elem) {
                        elem.isDetailSelected(newV);
                    });
                });
                item.WFContractDetailInfoes = ko.observableArray(item.WFContractDetailInfoes);
                item.currentInvoiceAmount = ko.computed(function () {
                    var result = 0;
                    $.each(item.WFContractDetailInfoes(), function (k, detail) {
                        if (detail.isDetailSelected()) result += utils.roundAmount(detail.AmountComputed());
                    });
                    if (Math.abs(result) < Math.Epsilon) return '';
                    return utils.formatDecimal(result, models.settings.decimalDigits);
                });
                list.push(item);
            });

            vm.allContractList(list);
            var avilableList = [];
            if (vm.currencyId()) {
                avilableList = $.grep(list, function (r) {
                    return r.CurrencyId == vm.currencyId();
                });
            }
            vm.contractList(avilableList);
        };
        vm.fillInvoiceSummaries = function (data) {
            vm.invoiceSummaryList(data.Data.result);
            base._p(data.Data.pagination, options.loadInvoiceSummariesUrl, vm.fillInvoiceSummaries, function () {
                return $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: true });
            });
        };
    }
    viewModel.call(this);

    self.onSearch = function () {
        var query = $.extend(utils.serialize("#searchForm .gmk-data-field"), { IsReceive: true });
        base._get(options.loadInvoiceSummariesUrl, query, function (data) {
            self.fillInvoiceSummaries(data);
        });
    };

    self.onAdd = function (item, event) {
        base._get(options.loadCustomerWithContractDetailsUrl, { CustomerId: item.WFCompanyId, IsReceive: true }, function (data) {
            self.fillCustomerWithContractDetails(data);
            var $divQueryResult = $('#divQueryResult');
            if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
            $divQueryResult.expandable();
            options.$fillTab.tab('show');
        }, true);
    };

    self.onSave = function () {
        var data = self.toJson();
        if (!data) return;
        base._save(options.saveUrl, data, function () {
            if (self.key || contractId) {
                History.back();
                return;
            }
            $('#record a:first').tab('show');
            self.onSearch();
        });
    };
    var contractId;
    self.initialize = function () {
        var url = $.url(); // parse the current page URL using jQuery plug in(https://github.com/allmarkedup/purl)
        self.key = url.param('id');
        if (url.param('id') && url.param('customerId')) {
            base._get(options.loadCustomerWithContractDetailsUrl, {
                CustomerId: url.param('customerId'),
                IsReceive: true,
                InvoiceId: url.param('id')
            }, function (data) {
                self.fillCustomerWithContractDetails(data);
                options.$fillTab.tab('show');
                options.$fillTab.parents('ul.nav-tabs').hide();
                base._get(options.loadUrl, { id: url.param('id') }, function (request) {
                    self.fillRecord(request);
                    $('#divQueryResult').expandable();
                }, true);
            }, true);
        } else if (url.param('customerId') && url.param('contractId')) {
            contractId = url.param('contractId');
            base._get(options.loadCustomerWithContractDetailsUrl, {
                CustomerId: url.param('customerId'),
                ContractId: url.param('contractId'),
                IsReceive: true
            }, function (data) {
                self.fillCustomerWithContractDetails(data);
                $('#divQueryResult').expandable();
                options.$fillTab.tab('show');
                options.$fillTab.parents('ul.nav-tabs').hide();
            }, true);
        } else {
            base._get(options.loadInvoiceSummariesUrl, { IsReceive: true }, function (data) {
                self.fillInvoiceSummaries(data);
            }, true);
        }
    }
}

GMK.Invoice.ReceivingRecords.DetailViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function extendContractDetailViewModel(vm) {
        var weight = parseFloat(vm.Weight) || 0, price = parseFloat(vm.Price) || 0;
        delete vm.Weight;
        delete vm.Amount;
        delete vm.Price;

        vm.isDetailSelected = ko.observable(false);
        vm.Weight = ko.observable(weight);
        vm.Amount = ko.observable(utils.roundAmount(price * weight));
        vm.Note = ko.observable();
    };

    function viewModel() {
        var vm = this;
        vm.customer = ko.observable();
        vm.record = ko.observable();
        vm.requestBank = ko.observable();
        vm.contractList = ko.observableArray();
        vm.totalAmount = ko.computed(function () {
            var result = { TotalAmount: 0, TotalWeight: 0 };
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes(), function (j, d) {
                    result.TotalAmount = utils.roundAmount(result.TotalAmount + (d.isVisible() ? utils.roundAmount(d.Amount()) : 0));
                    result.TotalWeight = utils.roundAmount(result.TotalWeight + (d.isVisible() ? utils.roundAmount(d.Weight(), 4) : 0), 4);
                });
            });
            result.TotalAmount = result.TotalAmount;
            result.TotalWeight = result.TotalWeight;
            return result;
        });

        vm.fillCustomerWithContractDetails = function (data) {
            vm.customer(data.customer);
            vm.contractList.removeAll();
            $.each(data.contracts, function (i, item) {
                item.isVisible = ko.observable(false);
                $.each(item.WFContractDetailInfoes, function (j, d) {
                    extendContractDetailViewModel(d);
                    d.isVisible = ko.observable(false);
                });
                item.WFContractDetailInfoes = ko.observableArray(item.WFContractDetailInfoes);
                vm.contractList.push(item);
            });
        };

        function _cloneContractDetail(item) {
            var result = ko.mapping.toJS(item);
            if (result.hasOwnProperty('ContractWeight')) result.Weight = result.ContractWeight;
            extendContractDetailViewModel(result);
            result.Amount(0);
            return result;
        }
        vm.fillRecord = function (data) {
            vm.record(data);

            $.each(data.WFContractInvoices, function (i, item) {
                $.each(vm.contractList(), function (j, c) {
                    $.each(c.WFContractDetailInfoes(), function (k, detail) {
                        if (detail.WFContractDetailInfoId == item.WFContractDetailInfoId) {
                            if (c.isVisible()) {
                                detail = _cloneContractDetail(detail);
                                detail.isVisible = ko.observable(true);
                                c.WFContractDetailInfoes.splice(k + 1, 0, detail);
                            }
                            c.isVisible(true);
                            detail.isVisible(true);
                            detail.Weight(utils.roundAmount(item.Weight, 4));
                            detail.Amount(utils.roundAmount(item.Amount));
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
        if (url.param('id') && url.param('customerId')) {
            base._get(options.loadCustomerWithContractDetailsUrl, { CustomerId: url.param('customerId'), IsReceive: true, InvoiceId: url.param('id') }, function (data) {
                self.fillCustomerWithContractDetails(data);

                base._get(options.loadUrl, { id: url.param('id') }, function (request) {
                    self.fillRecord(request);
                }, true);
            }, true);
        }
    }
}

$(document).ready(function () {
    GMK.Invoice.ReceivingRecords.start();
});
