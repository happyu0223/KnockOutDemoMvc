/**
 * User: dawson.liu
 * Date: 13-9-17
 * Time: 上午10:10
 */

var GMK = GMK || {};
GMK.Invoice = GMK.Invoice || {};
GMK.Invoice.InvoiceRequests = GMK.Invoice.InvoiceRequests || {};

GMK.Invoice.InvoiceRequests.start = function (data) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Invoice/',
        action: $routeElem.data("action"),
        contractId: $routeElem.data("contractid")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Manage') {
            var viewModel = new GMK.Invoice.InvoiceRequests.ManageViewModel(models, {
                contractId: route.contractId,
                loadInvoiceSummariesUrl: route.baseUrl + 'ListInvoiceSummaries',
                loadCustomerWithContractDetailsUrl: route.baseUrl + 'LoadContractDetailsForInvoice',
                loadUrl: route.baseUrl + 'GetInvoiceRequest',
                searchUrl: route.baseUrl + 'ListContracts',
                saveUrl: route.baseUrl + 'SaveInvoiceRequest',
                listUrl: route.baseUrl + 'InvoiceRequests',
                invoiceRequestDetailsUrl: data.invoiceRequestDetailsUrl,
                $applyTab: $('#apply a:last')
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else if (route.action === 'InvoiceRequestDetails') {
            var viewModel = new GMK.Invoice.InvoiceRequests.DetailsViewModel(models, {
                id: $routeElem.data("id"),
                customerId: $routeElem.data("customerid"),
                loadCustomerWithContractDetailsUrl: route.baseUrl + 'LoadContractDetailsForInvoice',
                getUrl: 'Invoice/GetInvoiceRequest',
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else {
            var viewModel = new GMK.Invoice.InvoiceRequests.ListViewModel(models, {
                contractId: route.contractId,
                searchUrl: route.baseUrl + 'ListInvoiceRequests',
                deleteUrl: route.baseUrl + 'DeleteInvoiceRequest',
                editUrl: route.baseUrl + 'EditInvoiceRequest',
                finishUrl: route.baseUrl + 'FinishInoviceRequest',
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            function initialize(query) {
                utils.deserialize('#searchForm .gmk-data-field', query);
                viewModel.initialize(query);
            }
            utils.responseStateChange();
            initialize(models.getQuery());
            models.registerStateChange(initialize);
        }
    });
};


GMK.Invoice.InvoiceRequests.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contractCode = ko.observable(options.contractCode);
        vm.contractId = ko.observable(options.contractId);
        vm.requestList = ko.observableArray();
        vm.pageSummary = {
            Amount: ko.computed(function () {
                var sum = 0;
                $.each(vm.requestList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.Amount));
                });
                return sum;
            }),
            Taxation: ko.computed(function () {
                var sum = 0;
                $.each(vm.requestList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.Taxation));
                });
                return sum;
            })
        };
        vm.searchSummary = ko.observable({});
        vm.fill = function (result) {
            for (var i = 0; i < result.Data.list.length; i++) {
                result.Data.list[i].ApplyStatus = ko.observable(result.Data.list[i].Status);
            }
            vm.requestList(result.Data.list);
            vm.searchSummary(result.Data.summary);
            base._p(result.Data.pagination, options.searchUrl, vm.fill);
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        utils.responseStateChange(false);
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFInvoiceRequestId }, function () {
            var $elem = $(event.currentTarget).closest('tr');
            if ($elem) {
                $elem.remove();
            }
            self.onSearch();
        });
    };

    self.onFinish = function (item, event) {
        confirm('你确定要完成申请吗？', function () {
            base._post(options.finishUrl, { id: item.WFInvoiceRequestId }, function (data) {
                $(event.currentTarget).closest('tr').find('.gmk-status').removeClass('label-warning').addClass('label-success').text('完成');
                item.ApplyStatus(data.Status);
            });
        });
    };

    self.initialize = function (query) {
        base._get(options.searchUrl, query, function (list) {
            self.fill(list);
        }, true);
    }
};

GMK.Invoice.InvoiceRequests.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function extendContractDetailViewModel(vm) {
        var weight = parseFloat(vm.ActualWeight ? vm.ActualWeight : vm.Weight), price = parseFloat(vm.ActualPrice ? vm.ActualPrice : vm.Price) || 0;
        delete vm.Weight;
        delete vm.Price;

        vm.isDetailSelected = ko.observable(false);
        vm.ContractWeight = ko.observable(weight);
        vm.Weight = ko.observable(new BigDecimal(weight.toString()).subtract(new BigDecimal(vm.AppliedInvoiceWeight.toString())).toString());
        vm.Price = ko.observable(price);

        vm.OldWeight = ko.observable(0);
        vm.HadApplyWeight = ko.computed(function () {
            return new BigDecimal(vm.AppliedInvoiceWeight.toString())
                .subtract(new BigDecimal(vm.OldWeight().toString()))
                .add(new BigDecimal(vm.Weight() ? vm.Weight().toString() : "0")).toString();
        });
        vm.NotApplyWeight = ko.computed(function () {
            return new BigDecimal(vm.ContractWeight().toString())
                .subtract(new BigDecimal(vm.HadApplyWeight().toString())).toString();
        });

        vm.Amount = ko.observable(utils.roundAmount(vm.Weight() * vm.Price()));
        vm.Note = ko.observable();
        vm.TaxRate = ko.observable(0.17);
        vm.TaxRateComputed = ko.computed({
            read: function () {
                return 100 * vm.TaxRate();
            },
            write: function (value) {
                var taxRate = (value / 100) || 0;
                vm.TaxRate(taxRate);
            }
        });
        vm.Taxation = ko.computed(function () {
            var taxRate = new BigDecimal(vm.TaxRate().toString());
            return utils.formatDecimal(new BigDecimal(vm.Amount().toString()).divide(new BigDecimal("1").add(taxRate)).multiply(taxRate).toString(), self.settings.decimalDigits, '');
        });

        vm.AmountComputed = ko.computed({
            read: vm.Amount,
            write: function (value) {
                var amount = parseFloat(value) || 0;
                vm.Amount(parseFloat(amount));
                var weight = parseFloat(vm.Weight()) || 0;
                if (weight != 0) {
                    var price = new BigDecimal(vm.Amount().toString()).divide(new BigDecimal(weight.toString())).toString();
                    vm.Price(utils.formatDecimal(price, self.settings.decimalDigits, ''));
                }
            }
        });
        vm.WeightComputed = ko.computed({
            read: vm.Weight,
            write: function (value) {
                var weight = parseFloat(value) || 0;
                vm.Weight(parseFloat(weight));
                var price = parseFloat(vm.Price()) || 0;
                vm.Amount(utils.formatDecimal(new BigDecimal(weight.toString()).multiply(new BigDecimal(price.toString())).toString(), self.settings.decimalDigits, ''));
            }
        });
        vm.PriceComputed = ko.computed({
            read: vm.Price,
            write: function (value) {
                var price = parseFloat(value) || 0;
                vm.Price(parseFloat(price));
                var weight = parseFloat(vm.Weight()) || 0;
                vm.Amount(utils.formatDecimal(new BigDecimal(weight.toString()).multiply(new BigDecimal(price.toString())).toString(), self.settings.decimalDigits, ''));
            }
        });
    }

    function viewModel() {
        var vm = this;
        vm.invoiceSummaryList = ko.observableArray();
        vm.customer = ko.observable();
        vm.contractList = ko.observableArray();
        vm.contractCode = ko.observable();
        vm.contractId = ko.observable();
        vm.selectedBank = ko.observable();

        vm.currencyId = ko.observable(vm.AllCurrencies[0].id); //默认取人民币
        vm.allContractList = ko.observableArray();
        vm.currencyId.subscribe(function (newVal) {
            if (newVal) {
                var avilableList = $.grep(vm.allContractList(), function (r) {
                    return r.CurrencyId == vm.currencyId();
                });
                vm.contractList(avilableList);
                options.$applyTab.tab('show');
                self.registerHandlers();
            }
        });
        vm.currencyDisable = ko.observable(false);

        vm.totalAmount = ko.computed(function () {
            var result = { Amount: new BigDecimal("0.00"), Taxation: new BigDecimal("0.00") };
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes(), function (j, d) {
                    if (d.isDetailSelected()) {
                        result.Amount = result.Amount.add(new BigDecimal(utils.roundAmount(d.Amount()).toString()));
                        result.Taxation = result.Taxation.add(new BigDecimal(utils.roundAmount(d.Taxation()).toString()));
                    }
                });
            });
            result.Amount = result.Amount.toString();
            result.Taxation = result.Taxation.toString();
            return result;
        });
        vm.filteredCommodityId = ko.observable();
        vm.filteredContractType = ko.observable();

        vm.toJson = function () {
            var requestDetails = [];
            $.each(vm.contractList(), function (i, item) {
                $.each(item.WFContractDetailInfoes(), function (j, d) {
                    if (item.isVisible() && d.isDetailSelected()) {
                        d.CommodityId = item.CommodityId;
                        requestDetails.push(d);
                    }
                });
            });

            var formData = utils.serialize('#requestForm .gmk-data-field');
            var invoiceRequest = $.extend(vm.totalAmount(), formData, {
                CustomerId: vm.customer().WFCompanyId,
                CustomerBankId: vm.selectedBank().WFCompanyBankInfoId,
                WFInvoiceRequestDetails: requestDetails,
                WFInvoiceRequestId: self.key || '0',
                CurrencyId : self.currencyId(),
            });

            return invoiceRequest;
        };
        vm.onAddInvoiceDetail = function (item) {
            this.WFContractDetailInfoes.splice(this.WFContractDetailInfoes.indexOf(item) + 1, 0, _cloneContractDetail(item));
            vm.totalAmount.peek();
        };
        function _cloneContractDetail(item) {
            var result = ko.mapping.toJS(item);
            extendContractDetailViewModel(result);
            result.Amount(0);
            return result;
        }
        vm.onRemoveInvoiceDetail = function (item) {
            this.WFContractDetailInfoes.remove(item);
        };
        vm.fillRequest = function (request) {
            var data = request.Data;
            vm.currencyId(data.CurrencyId);
            vm.currencyDisable(true);
            utils.deserialize('#requestForm .gmk-data-field', data);
            $.each(data.WFInvoiceRequestDetails, function (i, item) {
                $.each(vm.contractList(), function (j, c) {
                    $.each(c.WFContractDetailInfoes(), function (k, d) {
                        if (d.WFContractDetailInfoId == item.WFContractDetailInfoId) {
                            if (d.isDetailSelected()) {
                                d = _cloneContractDetail(d);
                                c.WFContractDetailInfoes.splice(k+1, 0, d);
                            }
                            d.isDetailSelected(true);
                            d.OldWeight(item.Weight);
                            d.Weight(item.Weight);
                            d.Price(item.Price);
                            d.TaxRate(utils.roundAmount(item.TaxRate));
                            d.Note(item.Note);
                            d.Amount(utils.roundAmount(item.Amount));
                            c.isContractSelected(true);
                            return false;
                        }
                    });
                });
            });
            $.each(vm.customer().WFCompanyBankInfoes, function (i, item) {
                if (item.WFCompanyBankInfoId == data.CustomerBankId) {
                    vm.selectedBank(item);
                }
            });
        };
        vm.fillInvoiceSummaries = function (data) {
            vm.invoiceSummaryList(data.Data.result);
            base._p(data.Data.pagination, options.loadInvoiceSummariesUrl, vm.fillInvoiceSummaries, function () {
                var query = utils.serialize("#searchForm .gmk-data-field");
                self.invoiceSummaryQuery.CommodityId(query.CommodityId);
                self.invoiceSummaryQuery.ContractType(query.ContractType);
                return query;
            });
        };
        vm.fillCustomerWithContractDetails = function (data, request) {
            var contractDetailsIds = [];
            if (request && request.Status) {
                contractDetailsIds = $.map(request.Data.WFInvoiceRequestDetails, function (r) {
                    return r.WFContractDetailInfoId;
                });
            }
            vm.customer(data.customer);
            $.each(vm.customer().WFCompanyBankInfoes, function (i, item) {
                if (item.Type == 0) {
                    vm.selectedBank(item);
                    return false;
                }
            });
            //   vm.contractList.removeAll();
            var list = [];
            $.each(data.contracts, function (i, item) {
                $.each(item.WFContractDetailInfoes, function (j, d) {
                    extendContractDetailViewModel(d);
                    d.Weight(utils.formatDecimal(d.Weight(), vm.settings.weightDigits, ''));
                    d.Amount(utils.formatDecimal(d.UnHappenedInvoiceAmount, vm.settings.decimalDigits, ''));
                    d.Price(utils.formatDecimal(d.UnHappenedInvoiceAmount / d.Weight(), vm.settings.decimalDigits, ''));
                });
                item.WFContractDetailInfoes = ko.observableArray(item.WFContractDetailInfoes);
                item.isContractSelected = ko.observable(false);
                item.isVisible = ko.computed(function () {
                    return (vm.filteredCommodityId() == undefined || item.CommodityId == vm.filteredCommodityId())
                        && (vm.filteredContractType() == undefined || item.ContractType == vm.filteredContractType());
                });
                var isFill = true;
                if (contractDetailsIds.length > 0) {
                    isFill = $.grep(item.WFContractDetailInfoes(), function (r) {
                        return $.inArray(r.WFContractDetailInfoId, contractDetailsIds) > -1;
                    }).length > 0;
                }
                if (isFill) {
                    list.push(item);
                }
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
    }
    viewModel.call(this);

    self.registerHandlers = function () {
        $.each(self.contractList(), function (i, item) {
            item.isContractSelected.subscribe(function (val) {
                for (var i = 0; i < item.WFContractDetailInfoes().length; i++) {
                    item.WFContractDetailInfoes()[i].isDetailSelected(val);
                }
            });
        });
    };

    self.invoiceSummaryQuery = {
        CommodityId: ko.observable(),
        ContractType: ko.observable()
    };
    self.onSearch = function () {
        var query = utils.serialize("#searchForm .gmk-data-field");
        self.invoiceSummaryQuery.CommodityId(query.CommodityId);
        self.invoiceSummaryQuery.ContractType(query.ContractType);
        base._get(options.loadInvoiceSummariesUrl, query, function (data) {
            self.fillInvoiceSummaries(data);
        });
    };

    function _preSave() {
        if (self.selectedBank() == undefined) {
            alert('客户银行信息有误！请确认该客户添加了银行信息！');
            return false;
        }

        var data = self.toJson();
        if (data.WFInvoiceRequestDetails.length == 0) {
            alert("请选择合同明细并编辑");
            return false;
        }

        return true;
    }
    self.save = function (callback) {
        if (!_preSave()) return false;
        base._save(options.saveUrl, self.toJson(), callback);
    };

    self.onSave = function () {
        if (!_preSave()) return false;
        base._save(options.saveUrl, self.toJson(), function () {
            if (self.key || self.contractId()) {
                History.back();
                return;
            }
            $('#apply a:first').tab('show');
            self.onSearch();
        });
    };

    self.onSaveAndPrint = function () {
        var win = utils.openWindow();
        self.save(function (result) {
            var printUrl = utils.urlAction("ArchiveIndex", "Template", {
                templateType: models.Enums.BillTemplateType.InvoiceRequestBill,
                dataSourceId: result.Data.WFInvoiceRequestId
            });
            win.redirectTo(printUrl);
            History.back();
        });
    };

    self.onSaveAndView = function () {
        self.save(function (result) {
            location.href = options.invoiceRequestDetailsUrl + result.Data.WFInvoiceRequestId + '?customerId=' + result.Data.CustomerId;
        });
    };

    self.onApply = function (item, event) {
        base._get(options.loadCustomerWithContractDetailsUrl, {
            CustomerId: item.WFCompanyId,
            CommodityId: self.invoiceSummaryQuery.CommodityId(),
            ContractType: self.invoiceSummaryQuery.ContractType(),
            IsReceive: false,
        }, function (data) {
            self.fillCustomerWithContractDetails(data);
            options.$applyTab.tab('show');
            self.registerHandlers();
        }, true);
    };

    self.initialize = function () {
        var url = $.url(); // parse the current page URL using jQuery plug in(https://github.com/allmarkedup/purl)
        self.key = url.param('id');
        if (url.param('id') && url.param('customerId')) {
            base._get(options.loadCustomerWithContractDetailsUrl, {
                CustomerId: url.param('customerId'),
                InvoiceRequestId: url.param('id'),
                IsReceive:false,
            }, function (data) {
                options.$applyTab.tab('show');
                options.$applyTab.parents('ul.nav-tabs').hide();
                base._get(options.loadUrl, {
                    id: url.param('id')
                }, function (request) {
                    self.fillCustomerWithContractDetails(data, request);
                    self.fillRequest(request);
                    self.registerHandlers();
                }, true);
            });
        } else if (url.param('contractId') && url.param('customerId')) {
            self.contractId(url.param('contractId'));
            base._get(options.loadCustomerWithContractDetailsUrl, {
                CustomerId: url.param('customerId'),
                ContractId: url.param('contractId'),
                IsReceive: false,
            }, function (data) {
                self.fillCustomerWithContractDetails(data);
                options.$applyTab.tab('show');
                options.$applyTab.parents('ul.nav-tabs').hide();
                if (url.param('id')) {
                    base._get(options.loadUrl, {
                        id: url.param('id')
                    }, function (request) {
                        self.fillRequest(request);
                        self.registerHandlers();
                    }, true);
                } else {
                    self.registerHandlers();
                }
                switch (self.contractList()[0].ContractType) {
                    case 0:
                    case 1: // 现货合同
                        self.returnUrl = GMK.Context.RootUrl + 'Contract/Index';
                        break;
                    case 2: // 交割合同
                        self.returnUrl = GMK.Context.RootUrl + 'Contract/DeliverContract';
                        break;
                    case 4: // 长单批次合同
                        self.returnUrl = GMK.Context.RootUrl + 'Contract/LongIndex';
                        break;
                }
            }, true);
        } else {
            base._get(options.loadInvoiceSummariesUrl, null, function (data) {
                self.fillInvoiceSummaries(data);
            });
        }
    }
}

GMK.Invoice.InvoiceRequests.DetailsViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.banks = ko.observableArray([]);
    self.customer = ko.observable({});
    self.customerBank = ko.computed(function () {
        return utils.find(self.banks(), function (company) {
            return company.WFCompanyBankInfoId === self.request().CustomerBankId;
        }) || {};
    });
    self.contracts = ko.observableArray([]);
    self.request = ko.observable({});
    self.initialize = function () {
        base._get(options.loadCustomerWithContractDetailsUrl, {
            CustomerId: options.customerId,
            IsReceive: false,
            InvoiceRequestId: options.id
        }, function (data) {
            self.customer(data.customer);
            self.banks(data.customer.WFCompanyBankInfoes);
            base._get(options.getUrl, { id: options.id }, function (request) {
                self.request(request.Data);
                $.each(data.contracts, function (i, contract) {
                    contract.InvoiceDetails = [];
                    $.each(contract.WFContractDetailInfoes, function (j, contractDetail) {
                        var requestDetil = $.grep(self.request().WFInvoiceRequestDetails, function (rd) {
                            return contractDetail.WFContractDetailInfoId === rd.WFContractDetailInfoId;
                        });
                        if (requestDetil.length) {
                            $.each(requestDetil, function (i, item) {
                                item.ContractDetail = contractDetail;
                                contract.InvoiceDetails.push(item);
                            });
                        }
                    });
                });
                data.contracts = $.grep(data.contracts, function (contract) {
                    return !!contract.InvoiceDetails.length;
                });
                self.contracts(data.contracts);
            });
        });
    };
}

//$(document).ready(function () {
//    GMK.Invoice.InvoiceRequests.start();
//});