
var GMK = GMK || {};
GMK.BalanceSettlement = GMK.BalanceSettlement || {};

GMK.BalanceSettlement.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            commonModels.registerQueryFormEvent();
            viewModel = new GMK.BalanceSettlement.IndexViewModel(commonModels, route, {
                listUrl: route.baseUrl + 'List',
                deleteUrl: route.baseUrl + 'Delete',
                finishUrl: route.baseUrl + 'Finish'
            });
        } else if (route.action === 'Create') {
            viewModel = new GMK.BalanceSettlement.CreateViewModel(commonModels, route, {
                listUrl: route.baseUrl + 'List',
                listClientsUrl: route.baseUrl + 'ListClients',
                listContractsUrl: route.baseUrl + 'ListClientContracts',
                generateDetailsUrl: route.baseUrl + 'GenerateDetails',
                saveUrl: route.baseUrl + 'Create',
                indexUrl: route.baseUrl + 'Index',
                detailsUrl: route.baseUrl + 'Details'
            });
        } else if (route.action === 'Details') {
            viewModel = new GMK.BalanceSettlement.DetailsViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get'
            });
        } else if (route.action === 'Edit') {
            viewModel = new GMK.BalanceSettlement.EditViewModel(commonModels, route, {
                listContractsUrl: route.baseUrl + 'ListClientContracts',
                saveUrl: route.baseUrl + 'Edit',
                getUrl: route.baseUrl + 'Get',
                indexUrl: route.baseUrl + 'Index',
                detailsUrl: route.baseUrl + 'Details'
            });
        } else if (route.action === "SearchInvoice") {
            commonModels.registerQueryFormEvent();
            viewModel = new GMK.BalanceSettlement.SearchInvoiceViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'GetSearchInvoice',
            });
        } else if (route.action === "SearchInvoiceIndex") {
            commonModels.registerQueryFormEvent();
            viewModel = new GMK.BalanceSettlement.SearchInvoiceIndexViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'GetSearchInvoiceIndex',
            });
        }
        window.vm = viewModel;
        if (viewModel && viewModel.initialize) {
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        }
    });
};

GMK.BalanceSettlement.ItemViewModel = function (item) {
    var self = $.extend(this, ko.mapping.fromJS(item));
};

GMK.BalanceSettlement.DetailItemViewModel = function (detail) {
    var self = $.extend(this, ko.mapping.fromJS(detail));
};

GMK.BalanceSettlement.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams, true);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.search = function (params, callback) {
        base._get('BalanceSettlement/List?' + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        var list = $.map(result.Data.list, function (r) {
            return ko.mapping.fromJS(r);
        });
        self.items(list);
        self.resultPagination(result.Data.pagination);
        base._pagination($("#pager"), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
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
    self.reload = function () {
        var params = self.queried();
        self.search(params);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFSettlementRequestlId()
        }, function () {
            self.reload();
        });
    };
    self.onFinish = function (item) {
        confirm('确定要完成结算？', function () {
            base._post(options.finishUrl, {
                id: item.WFSettlementRequestlId()
            }, function (result) {
                if (result.Status === true) {
                    self.reload();
                }
            });
        });
    }
};

GMK.BalanceSettlement.DetailsViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = {};
    var ItemViewModel = GMK.BalanceSettlement.ItemViewModel;
    //self.item = new ItemViewModel(self.commonModels.NewEntities.WFSettlementRequest);
    self.initialize = function (success) {
        self.loadItem(success);
    };
    self.receivables = ko.observableArray();
    self.payables = ko.observableArray();
    self.receivablesSumContractBalance = ko.computed(function () {
        var sum = 0;
        ko.utils.arrayForEach(self.receivables(), function (detail) {
            var contract = detail.WFContractInfo;
            var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
            sum = utils.roundAmount(sum + balance);
        });
        return sum;
    });
    self.receivablesSumAmout = ko.computed(function () {
        var sum = 0;
        ko.utils.arrayForEach(self.receivables(), function (detail) {
            var contract = detail.WFContractInfo;
            //var amout = contract.AmountActualTotal() - contract.AmountHappened() - contract.ApplyingPaymentAmount();
            sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
        });
        return sum;
    });
    self.payablesSumContractBalance = ko.computed(function () {
        var sum = 0;
        ko.utils.arrayForEach(self.payables(), function (detail) {
            var contract = detail.WFContractInfo;
            var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
            sum = utils.roundAmount(sum + balance);
        });
        return sum;
    });
    self.payablesSumAmout = ko.computed(function () {
        var sum = 0;
        ko.utils.arrayForEach(self.payables(), function (detail) {
            var contract = detail.WFContractInfo;
            //var amout = contract.AmountActualTotal() - contract.AmountHappened() - contract.ApplyingPaymentAmount();
            sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
        });
        return sum;
    });
    self.loadItem = function (success) {
        base._get(options.getUrl, {
            id: self.id
        }, function (result) {
            if (result.Status === true) {
                self.item = ko.mapping.fromJS(result.Data);

                ko.utils.arrayForEach(self.item.WFSettlementRequestDetails(), function (detail) {
                    if (detail.WFContractInfo.IsBuy()) {
                        self.payables.push(detail);
                    } else {
                        self.receivables.push(detail);
                    }
                });
                if (success) {
                    success();
                }
            }
        });
    };
};

GMK.BalanceSettlement.CreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.toquery = ko.mapping.fromJS({
        currencyId: (commonModels.AllCurrencies[0] || {}).id,
        accountEntityId: null,
        customerId: null,
        Pagination: {
            CurrentPage: 1,
            PageSize: 10
        }
    });
    self.queried = ko.observable(ko.mapping.toJS(self.toquery));
    self.resultPagination = ko.observable({});
    self.item = {};
    var ItemViewModel = GMK.BalanceSettlement.ItemViewModel;
    self.item = new ItemViewModel(route.values.item);
    self.initialized = ko.observable(false);
    self.initialize = function (success) {
        success();
        var params = ko.mapping.toJS(self.toquery);
        self.searchClients(params, function () {
            self.initialized(true);
        });
    };
    self.isSearching = ko.observable(false);
    self.onSearch = function () {
        self.toquery.Pagination.CurrentPage(1);
        var params = ko.mapping.toJS(self.toquery);
        self.searchClients(params);
    };
    self.searchClients = function (params, callback) {
        self.isSearching(true);
        base._get(options.listClientsUrl + '?' + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            //self.setUrl(params);
            self.fill(result);
            self.isSearching(false);
            if (callback) {
                callback();
            }
        });
    };
    self.changePage = function (newPage, pageSize) {
        var params = self.queried();
        var currPageSize = +self.toquery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.toquery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        self.searchClients(params);
    };
    self.clients = ko.observableArray();
    self.contracts = ko.observableArray();
    self.contractsCommodityOptions = ko.observableArray(commonModels.UserCommodities);
    self.contractsContractTypeOptions = ko.observableArray(commonModels.EnumOptions.ContractTypeUIDetail);
    self.clientId = ko.observable();
    self.currencyId = ko.observable();
    self.commodityId = ko.observable();
    self.receivables = ko.observableArray();
    self.payables = ko.observableArray();
    self.checkAllContract = ko.observable(false);
    self.checkAllContract.subscribe(function (value) {
        var list = self.contracts();
        for (var i = 0; i < list.length; i++) {
            if (list[i].Enabled()) list[i].Checked(value);
        }
    });
    self.checkedClientIndex = ko.observable(-1);
    self.filter = {
        ContractType: ko.observable(0),
        IsLongContract: ko.observable(false),
        CommodityId: ko.observable(commonModels.UserCommodities.length > 0 ? commonModels.UserCommodities[0].id : null)
    };
    self.fill = function (result) {
        if (result.Status === true) {
            var list = $.map(result.Data.result, function (r) {
                return ko.mapping.fromJS(r);
            });
            self.clients(list);
            self.resultPagination(result.Data.pagination);
            base._pagination({
                $elem: $('#gmk-pager'),
                pageCount: +self.resultPagination().PageCount,
                itemCount: +self.resultPagination().TotalCount,
                pageSize: +self.resultPagination().PageSize,
                currentPage: +self.queried().Pagination.CurrentPage,
                changePage: self.changePage
            });
            ////self.clients(mapped());
            //if (result.Data.result.length > 0) {
            //    self.checkedClientIndex(0);
            //} else {
            //    self.checkedClientIndex(-1);
            //}
            //self.selectClient();
        }
    }
    var selectedClient;
    self.selectClient = function () {
        //var index = parseInt(self.checkedClientIndex());
        //self.checkAllContract(false);
        var index = -1;
        var radios = $('input[name="ClientId"]:radio');
        for (var i = 0, l = radios.length; i < l; i++) {
            if (radios[i].checked) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            selectedClient = self.clients()[index];
            self.loadContractList(selectedClient);
        }
    };
    self.selectedContractsSumBalance = ko.computed(function () {
        var sum = 0;
        $.each(self.contracts(), function (i, r) {
            if (r.Enabled() && r.Checked()) {
                sum = utils.roundAmount(sum + (r.IsBuy() ? -1 : 1) * (r.AmountActualTotal() - r.AmountHappened() - r.ApplyingPaymentAmount()));
            }
        });
        return sum;
    });
    function getMonthInvoice(invoiceDate, signDate) {
        if (invoiceDate && signDate) {
            var invoiceMonth = moment(invoiceDate).startOf('month'),
                signMonth = moment(signDate).startOf('month');
            if (invoiceMonth.isSame(signMonth, 'month')) {
                return '当月票';
            } else if (invoiceMonth.isSame(signMonth.clone().add('months', 1), 'month')) {
                return '下月票';
            }
        }
        return '';
    }
    function getIsCurrMonthInvoice(invoiceDate, currMoment) {
        return getMonthInvoice(invoiceDate, currMoment) === '当月票';
    }
    self.loadContractList = function (client) {
        var clientId = client.ClientId();
        var accountEntityId = self.queried().accountEntityId;
        var currencyId = self.queried().currencyId;
        self.clientId(clientId);
        self.currencyId(currencyId);
        self.contracts.removeAll();
        base._get(options.listContractsUrl, {
            clientId: clientId,
            currencyId: currencyId,
            accountEntityId: accountEntityId
        }, function (result) {
            if (result.Status === true) {
                var currMoment = moment();
                var commodityIds = [], contractTypes = [];
                $.each(result.Data, function (i, r) {
                    var contract = ko.mapping.fromJS(r);
                    contract.monthInvoice = getMonthInvoice(contract.InvoiceDate(), contract.SignDate());
                    contract.isCurrMonthInvoice = getIsCurrMonthInvoice(contract.InvoiceDate(), currMoment);
                    contract.Enabled = ko.observable(false);
                    contract.Checked = ko.observable(contract.isCurrMonthInvoice);
                    self.contracts.push(contract);
                    if ($.inArray(r.CommodityId, commodityIds) === -1) {
                        commodityIds.push(r.CommodityId);
                    }
                    if ($.inArray(r.ContractType, contractTypes) === -1) {
                        contractTypes.push(r.ContractType);
                    }
                });
                //for (var i = 0, l = result.Data.length; i < l; i++) {
                //    var contract = ko.mapping.fromJS(result.Data[i]);
                //    contract.Checked = ko.observable(false);
                //    contract.Enabled = ko.observable(false);
                //    self.contracts.push(contract);
                //}
                //var mapped = ko.mapping.fromJS(result.Data);
                //self.contracts(mapped());
                var commodityOptions = $.grep(commonModels.UserCommodities, function (r) {
                    return $.inArray(r.id, commodityIds) > -1;
                });
                if (commodityOptions.length === 0) {
                    commodityOptions = commonModels.UserCommodities;
                }
                self.contractsCommodityOptions(commodityOptions);
                self.filter.CommodityId((commodityOptions[0] || {}).id);
                var normalContractOptions = $.grep(commonModels.EnumOptions.ContractTypeUIGroup, function (r) {
                    return r.value === commonModels.Enums.ContractTypeUIGroup.NormalContract;
                });
                var defaultDontractTypeOptions = normalContractOptions.concat(commonModels.EnumOptions.ContractTypeUIDetail);
                var contractTypeOptions = $.grep(defaultDontractTypeOptions, function (r) {
                    if (r.value === commonModels.Enums.ContractTypeUIGroup.NormalContract) {
                        return $.inArray(commonModels.Enums.ContractType.FixPricing, contractTypes) > -1 || $.inArray(commonModels.Enums.ContractType.FirePricing, contractTypes) > -1;
                    } else {
                        return $.inArray(r.value, contractTypes) > -1;
                    }
                });
                if (contractTypeOptions.length === 0) {
                    contractTypeOptions = defaultDontractTypeOptions;
                }
                self.contractsContractTypeOptions(contractTypeOptions);
                self.filter.ContractType(undefined);

                self.filterContracts();
            }
        });
    };
    self.onFilterContracts = function (data, event) {
        self.filterContracts();
    };
    self.filterContracts = function () {
        var contractType = self.filter.ContractType();
        var isLongContract = self.filter.IsLongContract();
        var commodityId = self.filter.CommodityId();
        self.commodityId(commodityId);
        $.each(self.contracts(), function (i, contract) {
            //contract.Checked(false);
            var enable = commodityId === contract.CommodityId() && (
                contractType === undefined || contractType === null || contractType === contract.ContractType() ||
                contractType === commonModels.Enums.ContractTypeUIGroup.NormalContract && (commonModels.Enums.ContractType.FixPricing === contract.ContractType() || commonModels.Enums.ContractType.FirePricing === contract.ContractType()));
            contract.Enabled(enable);
        });
        //for (var i = 0, l = self.contracts().length; i < l; i++) {
        //    var contract = self.contracts()[i];
        //    contract.Checked(false);
        //    //contract.Enabled(commodityId == contract.CommodityId() && isLongContract == (contract.ContractType() == commonModels.Enums.ContractType.LongContract || contract.ContractType() == commonModels.Enums.ContractType.LongContractDetail));
        //    contract.Enabled(commodityId == contract.CommodityId() && contractType == contract.ContractType());
        //}
        //self.checkAllContract(false);
    };
    //self.loadContracts = function (getQuery) {
    //    return function () {
    //        var query = getQuery();
    //        self.clientId(query.ClientId);
    //        self.commodityId(query.CommodityId);
    //        self.contracts.removeAll();
    //        base._get(options.listContractsUrl, {
    //            clientId: query.ClientId,
    //            commodityId: query.CommodityId,
    //            isLongContract: query.IsLongContract
    //        }, function (result) {
    //            if (result.Status === true) {
    //                self.contracts.removeAll();
    //                for (var i = 0, l = result.Data.length; i < l; i++) {
    //                    //if (result.Data[i].CommodityId == query.CommodityId
    //                    //    && ('' + query.IsLongContract == 'true' && (result.Data[i].ContractType == commonModels.Enums.ContractType.LongContract || result.Data[i].ContractType == commonModels.Enums.ContractType.LongContractDetail)
    //                    //    || '' + query.IsLongContract == 'false' && !(result.Data[i].ContractType == commonModels.Enums.ContractType.LongContract || result.Data[i].ContractType == commonModels.Enums.ContractType.LongContractDetail)
    //                    //    )) {
    //                    var row = ko.mapping.fromJS(result.Data[i]);
    //                    row.Checked = ko.observable(false);
    //                    self.contracts.push(row);
    //                    //}
    //                }
    //            }
    //        });
    //    };
    //};

    var threshhold = 150;
    self.receivablesSumContractBalance = ko.observable().extend({ throttle: threshhold });
    self.receivablesSumAmout = ko.observable().extend({ throttle: threshhold });
    self.payablesSumContractBalance = ko.observable().extend({ throttle: threshhold });
    self.payablesSumAmout = ko.observable().extend({ throttle: threshhold });

    function recomputed() {
        self.receivablesSumContractBalance((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.receivables(), function (detail) {
                var contract = detail.WFContractInfo;
                var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
                sum = utils.roundAmount(sum + balance);
            });
            return sum;
        })());
        self.receivablesSumAmout((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.receivables(), function (detail) {
                sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
            });
            return sum;
        })());
        self.payablesSumContractBalance((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.payables(), function (detail) {
                var contract = detail.WFContractInfo;
                var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
                sum = utils.roundAmount(sum + balance);
            });
            return sum;
        })());
        self.payablesSumAmout((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.payables(), function (detail) {
                sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
            });
            return sum;
        })());
    }

    self.onGenerate = function (getOption, callback) {
        return function () {
            if (getOption) {
                var option = getOption();
                var ins = [];
                if (option.ContractIndex) {
                    ins = option.ContractIndex.split(',');
                }
            } else {
                var ins = $.grep(self.contracts(), function (r) {
                    return r.Enabled() && r.Checked();
                });
            }
            if (ins.length == 0) {
                alert('未选择合同');
                return;
            }
            self.item.CustomerId(self.clientId());
            self.item.CurrencyId(self.currencyId());
            self.item.CommodityId(self.commodityId());
            self.item.WFSettlementRequestDetails.removeAll();
            self.receivables.removeAll();
            self.payables.removeAll();
            var contractIds = [];
            for (var i = 0, l = ins.length; i < l; i++) {
                var contract = ins[i];

                //contractIds.push(contract.WFContractInfoId());

                var detail = new GMK.BalanceSettlement.DetailItemViewModel(route.values.newDetail);
                detail.WFContractInfo = (contract);
                detail.WFContractInfoId(contract.WFContractInfoId());
                detail.WFSettlementRequestlId(self.item.WFSettlementRequestlId());
                var isBuy = contract.IsBuy();
                detail.Amount((isBuy ? -1: 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) -utils.roundAmount(contract.AmountHappened()) -utils.roundAmount(contract.ApplyingPaymentAmount())));
                detail.Amount.subscribe(recomputed);
                //detail.CurrencyId();
                //detail.IsPay(isBuy);
                if (isBuy) {
                    self.payables.push(detail);
                } else {
                    self.receivables.push(detail);
                }
                self.item.WFSettlementRequestDetails.push(detail);
            }
            recomputed();
            if (callback) {
                callback();
            }
            utils.formatDecimal();
        }
    };

    self.onSave = function () {
        var plainItem = ko.mapping.toJS(self.item);
        base._post(options.saveUrl, plainItem, function (result) {
            ko.mapping.fromJS(result.Data.ClientInfo, selectedClient);
            var radio = $('input[name="ClientId"]:radio:checked');
            radio.removeAttr('checked');
            var rowElem = radio.closest('tr'), origBackgroundColor = rowElem.css('background-color') || 'transparent';
            rowElem.animate({ 'background-color': '#f7f6be' }, 'fast').animate({ 'background-color': origBackgroundColor }, 3000);
            self.contracts.removeAll();
            $('#balanceSettlementModal').modal('hide');
        });
    };
    self.onSaveAndPrint = function () {
        var plainItem = ko.mapping.toJS(self.item);
        var win = utils.openWindow();
        base._post(options.saveUrl, plainItem, function (result) {
            Cookies.set('alert-message', '保存成功');
            var printUrl = GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({
                templateType: commonModels.Enums.BillTemplateType.SettlementBill,
                dataSourceId: result.Data.SettlementRequest.WFSettlementRequestlId
            });
            win.redirectTo(printUrl);
            History.back();
        });
    };
};

GMK.BalanceSettlement.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = {};
    var ItemViewModel = GMK.BalanceSettlement.ItemViewModel;
    //self.item = new ItemViewModel(self.commonModels.NewEntities.WFSettlementRequest);
    self.initialize = function (success) {
        self.loadItem(function () {
            self.loadContracts(function () {
                var contractsArray = self.contracts();
                var detailsArray = self.item.WFSettlementRequestDetails();

                for (var i = 0, l = contractsArray.length; i < l; i++) {
                    contractsArray[i].oc(false);
                    contractsArray[i].Checked(false);
                    for (var j = 0, l2 = detailsArray.length; j < l2; j++) {
                        if (contractsArray[i].WFContractInfoId() == detailsArray[j].WFContractInfoId()) {
                            contractsArray[i].oc(true);
                            contractsArray[i].Checked(true);
                        }
                    }
                }

                //ko.utils.arrayForEach(self.item.WFSettlementRequestDetails(), function (detail) {
                //    var contractId = detail.WFContractInfoId();
                //    for (var i = 0, l = contractsArray.length; i < l; i++) {
                //        if (contractsArray[i].WFContractInfoId() == contractId) {
                //            contractsArray[i].oc(true);
                //            break;
                //        }
                //    }
                //});
                if (success) {
                    success();
                }
            });
        });
    };
    self.contracts = ko.observableArray();
    self.receivables = ko.observableArray();
    self.payables = ko.observableArray();
    var threshhold = 150;
    self.receivablesSumContractBalance = ko.observable().extend({ throttle: threshhold });
    self.receivablesSumAmout = ko.observable().extend({ throttle: threshhold });
    self.payablesSumContractBalance = ko.observable().extend({ throttle: threshhold });
    self.payablesSumAmout = ko.observable().extend({ throttle: threshhold });
    function recomputed() {
        self.receivablesSumContractBalance((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.receivables(), function (detail) {
                var contract = detail.WFContractInfo;
                var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
                sum = utils.roundAmount(sum + balance);
            });
            return sum;
        })());
        self.receivablesSumAmout((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.receivables(), function (detail) {
                sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
            });
            return sum;
        })());
        self.payablesSumContractBalance((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.payables(), function (detail) {
                var contract = detail.WFContractInfo;
                var balance = (contract.IsBuy() ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount()));
                sum = utils.roundAmount(sum + balance);
            });
            return sum;
        })());
        self.payablesSumAmout((function () {
            var sum = 0;
            ko.utils.arrayForEach(self.payables(), function (detail) {
                sum = utils.roundAmount(sum + utils.roundAmount(detail.Amount()));
            });
            return sum;
        })());
    }
    self.loadItem = function (callback) {
        base._get(options.getUrl, {
            id: self.id
        }, function (result) {
            if (result.Status === true) {
                self.item = ko.mapping.fromJS(result.Data);

                ko.utils.arrayForEach(self.item.WFSettlementRequestDetails(), function (detail) {
                    if (detail.WFContractInfo.IsBuy()) {
                        self.payables.push(detail);
                    } else {
                        self.receivables.push(detail);
                    }
                });
                if (callback) {
                    callback();
                }
            }
        });
    };
    self.selectedContractsSumBalance = ko.computed(function () {
        var sum = 0;
        $.each(self.contracts(), function (i, r) {
            if (r.Checked()) {
                sum = utils.roundAmount(sum + (r.IsBuy() ? -1 : 1) * (r.AmountActualTotal() - r.AmountHappened() - r.ApplyingPaymentAmount()));
            }
        });
        return sum;
    });
    self.loadContracts = function (callback) {
        var clientId = self.item.CustomerId();
        var commodityId = self.item.CommodityId();
        var currencyId = self.item.CurrencyId();
        var balanceId = self.item.WFSettlementRequestlId();
        //var contractType = self.item.WFSettlementRequestDetails()[0].WFContractInfo.ContractType();
        self.contracts.removeAll();
        base._get(options.listContractsUrl, {
            clientId: clientId,
            commodityId: commodityId,
            currencyId: currencyId,
            balanceId: balanceId
        }, function (result) {
            if (result.Status === true) {
                
                var list = $.map(result.Data, function (r) {
                    var row = ko.mapping.fromJS(r);
                    row.oc = ko.observable(false);
                    row.Checked = ko.observable(false);
                    var contractId = r.WFContractInfoId;
                    row.oldBalanceDetail = utils.find(self.item.WFSettlementRequestDetails(), function (r2) {
                        return r2.WFContractInfoId() === r.WFContractInfoId;
                    });
                    return row;
                });
                self.contracts(list);
                //self.contracts.removeAll();
                ////var data = [];
                //for (var i = 0, l = result.Data.length; i < l; i++) {
                //    if (result.Data[i].CommodityId == commodityId) {
                //        //result.Data[i].oc = false;
                //        //data.push(result.Data[i]);
                //        var row = ko.mapping.fromJS(result.Data[i]);
                //        row.oc = ko.observable(false);
                //        row.Checked = ko.observable(false);
                //        self.contracts.push(row);
                //    }
                //}
                ////var mapped = ko.mapping.fromJS(data);
                ////self.contracts(mapped());
                if (callback) {
                    callback();
                }
            }
        });
    };
    self.onGenerate = function (getOption, callback) {
        return function () {
            if (getOption) {
                var option = getOption();
                var ins = [];
                if (option.ContractIndex) {
                    ins = option.ContractIndex.split(',');
                }
            } else {
                var ins = [];
                for (var i = 0, l = self.contracts().length; i < l; i++) {
                    if (self.contracts()[i].Checked()) {
                        ins.push(i);
                    }
                }
            }
            if (ins.length == 0) {
                alert('未选择合同');
                return;
            }
            //self.item.CustomerId(self.clientId());
            //self.item.CommodityId(self.commodityId());
            var details = ko.mapping.toJS(self.item.WFSettlementRequestDetails());
            self.item.WFSettlementRequestDetails.removeAll();
            self.receivables.removeAll();
            self.payables.removeAll();
            var contractIds = [];
            for (var i = 0, l = ins.length; i < l; i++) {
                var contract = self.contracts()[ins[i]];

                //contractIds.push(contract.WFContractInfoId());

                var detail = new GMK.BalanceSettlement.DetailItemViewModel(route.values.newDetail);
                detail.WFContractInfo = (contract);
                detail.WFContractInfoId(contract.WFContractInfoId());
                detail.WFSettlementRequestlId(self.item.WFSettlementRequestlId());
                var isBuy = contract.IsBuy();
                detail.Amount((isBuy ? -1 : 1) * utils.roundAmount(utils.roundAmount(contract.AmountActualTotal()) - utils.roundAmount(contract.AmountHappened()) - utils.roundAmount(contract.ApplyingPaymentAmount())));
                detail.Amount.subscribe(recomputed);
                for (var j = 0, l2 = details.length; j < l2; j++) {
                    if (details[j].WFContractInfoId === detail.WFContractInfoId()) {
                        detail.Amount(utils.roundAmount(details[j].Amount));
                    }
                }
                //detail.CurrencyId();
                //detail.IsPay(isBuy);
                if (isBuy) {
                    self.payables.push(detail);
                } else {
                    self.receivables.push(detail);
                }
                self.item.WFSettlementRequestDetails.push(detail);
            }
            recomputed();
            if (callback) callback();

            utils.formatDecimal();
        }
    };

    self.onSave = function () {
        var plainItem = ko.mapping.toJS(self.item);
        //base._save(options.saveUrl, plainItem, null, function (result) {
        //    window.location.href = options.indexUrl;
        //});
        base._postThenBack(options.saveUrl, plainItem);
    };
    self.onSaveAndPrint = function () {
        var plainItem = ko.mapping.toJS(self.item);
        var win = utils.openWindow();
        base._post(options.saveUrl, plainItem, function (result) {
            Cookies.set('alert-message', '保存成功');
            var printUrl = GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({
                templateType: commonModels.Enums.BillTemplateType.SettlementBill,
                dataSourceId: self.id
            });
            win.redirectTo(printUrl);
            History.back();
        });
    };
}

GMK.BalanceSettlement.SearchInvoiceViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.availableBusinessDepartments = ko.computed(function () {
        if (self.toquery.CommodityId() != null) {
            return $.map($.grep(commonModels.AllCommodities, function (r) {
                return self.toquery.CommodityId() === r.id;
            }), function (r) {
                return r.businessDepartments || [];
            });
        } else
            return commonModels.UserBusinessDepartments;
    });

    self.pageSummary = {
        TotalHappenedAmount: ko.observable(),
        TotalHappenedInvoice: ko.observable(),
        RemainingInvoice: ko.observable(),
        Count: ko.observable(0),
    };
    self.countSummary = {
        TotalHappenedAmount: ko.observable(),
        TotalHappenedInvoice: ko.observable(),
        RemainingInvoice: ko.observable(),
        Count: ko.observable(0),
    };
    self.isCounting = ko.observable(false);

    self.fill = function (result) {
        var list = $.map(result.Data, function (r) {
            r.Checked = ko.observable(false);
            return ko.mapping.fromJS(r);
        });
        self.items(list);
        var totalHappenedAmount = 0;
        var totalHappenedInvoice = 0;
        var remainingInvoice = 0;
        var count = 0;
        $.each(self.items(), function (i, detail) {
            totalHappenedAmount += detail.TotalHappenedAmount();
            totalHappenedInvoice += detail.TotalHappenedInvoice();
            remainingInvoice += detail.RemainingInvoice();
            count += 1;
        });

        self.pageSummary.TotalHappenedAmount(totalHappenedAmount);
        self.pageSummary.TotalHappenedInvoice(totalHappenedInvoice);
        self.pageSummary.RemainingInvoice(remainingInvoice);
        self.pageSummary.Count(count);
    };
    self.onSearch = function () {
        var params = ko.mapping.toJS(self.toquery);
        if (params.StartDate != null) {
            params.StartDate = null;
        }
        if (params.EndDate != null) {
            params.EndDate = null;
        }
        base._get(options.getUrl, params, function (result) {
            self.queried(params);
            var urlParam = self.queried();
            utils.cleanEmpty(urlParam);
            history.replaceState(null, null, location.pathname + '?' + $.param(urlParam));
            self.fill(result);
        });
    };
    self.checkAll = ko.observable(false);
    self.autoCheckAll = ko.computed(function () {
        var data = $.grep(self.items(), function (r) {
            return r.Checked();
        });
        if (data.length == self.items().length && data.length > 0) {
            self.checkAll(true);
            return true;
        } else
            return false;
    });
    self.checkAll.subscribe(function (value) {
        $.each(self.items(), function (i, r) {
            r.Checked(value);
        });
    });

    self.onCountData = ko.computed(function () {
        var data = $.grep(self.items(), function (r) {
            return r.Checked();
        });
        var totalHappenedAmount = 0;
        var totalHappenedInvoice = 0;
        var remainingInvoice = 0;
        var count = 0;
        $.each(data, function (i, detail) {
            totalHappenedAmount += detail.TotalHappenedAmount();
            totalHappenedInvoice += detail.TotalHappenedInvoice();
            remainingInvoice += detail.RemainingInvoice();
            count += 1;
        });

        self.countSummary.TotalHappenedAmount(totalHappenedAmount);
        self.countSummary.TotalHappenedInvoice(totalHappenedInvoice);
        self.countSummary.RemainingInvoice(remainingInvoice);
        self.countSummary.Count(count);
        if (!self.isCounting()) {
            self.isCounting(true);
        }
    });

    self.initialize = function (callback) {
        if (self.toquery.CustomerId() > 0) {
            self.onSearch();
        }
        if (callback)
            callback();
    };

    self.onExport = function () {
        utils.fileDownload(utils.urlAction('ExportInvoiceIndex', 'Report', utils.getCleanedEmpty(ko.toJS(self.queried))));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var urlParams = $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), { downloadToken: downloadToken });
        //    var url = utils.urlAction('ExportInvoiceIndex', 'Report', urlParams);
        //    $form.attr('action', url);
        //    $form.empty();
        //});
    };
}

GMK.BalanceSettlement.SearchInvoiceIndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams, true);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});

    self.pageSummary = {
        TotalHappenedAmount: ko.observable(),
        TotalHappenedInvoice: ko.observable(),
        RemainingInvoice: ko.observable(),
        Count: ko.observable(0),
    };
    self.totalSummary = {
        TotalHappenedAmount: ko.observable(),
        TotalHappenedInvoice: ko.observable(),
        RemainingInvoice: ko.observable(),
        Count: ko.observable(0),
    };
    self.availableBusinessDepartments = ko.computed(function () {
        if (self.toquery.CommodityId() != null) {
            return $.map($.grep(commonModels.AllCommodities, function (r) {
                return self.toquery.CommodityId() === r.id;
            }), function (r) {
                return r.businessDepartments || [];
            });
        } else
            return commonModels.UserBusinessDepartments;
    });

    self.search = function (params, callback) {
        if (params.StartDate != null) {
            params.StartDate = null;
        }
        if (params.EndDate != null) {
            params.EndDate = null;
        }
        base._get(options.getUrl, params, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        self.totalSummary.TotalHappenedAmount(result.Data.list.TotalHappenedAmount);
        self.totalSummary.TotalHappenedInvoice(result.Data.list.TotalHappenedInvoice);
        self.totalSummary.RemainingInvoice(result.Data.list.RemainingInvoice);
        self.totalSummary.Count(result.Data.list.Count);
        if (result.Data.list.Invoices != null) {
            var list = $.map(result.Data.list.Invoices, function (r) {
                r.detailUrl = ko.computed(function () {
                    var params = utils.getCleanedEmpty(ko.toJS(self.queried));
                    params.CustomerId = r.CustomerId;
                    params.Pagination = null;
                    return '/BalanceSettlement/SearchInvoice/?' + $.param(params, true);
                });
                return ko.mapping.fromJS(r);
            });
            self.items(list);
        } else
            self.items([]);

        var totalHappenedAmount = 0;
        var totalHappenedInvoice = 0;
        var remainingInvoice = 0;
        var count = 0;
        $.each(self.items(), function (i, detail) {
            totalHappenedAmount += detail.TotalHappenedAmount();
            totalHappenedInvoice += detail.TotalHappenedInvoice();
            remainingInvoice += detail.RemainingInvoice();
            count += 1;
        });

        self.pageSummary.TotalHappenedAmount(totalHappenedAmount);
        self.pageSummary.TotalHappenedInvoice(totalHappenedInvoice);
        self.pageSummary.RemainingInvoice(remainingInvoice);
        self.pageSummary.Count(count);

        self.resultPagination(result.Data.pagination);
        base._pagination($("#pager"), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
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
        utils.fileDownload(utils.urlAction('ExportInvoiceIndex', 'Report', $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), { Pagination: null })));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var urlParams = $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), { downloadToken: downloadToken });
        //    urlParams.Pagination = null;
        //    var url = utils.urlAction('ExportInvoiceIndex', 'Report', urlParams);
        //    $form.attr('action', url);
        //    $form.empty();
        //});
    };
}