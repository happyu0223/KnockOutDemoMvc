/**
 * Created with JetBrains WebStorm.
 * User: dawson.liu
 * Date: 13-9-5
 * Time: 上午10:10
 * To change this template use File | Settings | File Templates.
 */

var GMK = GMK || {};
GMK.Settlement = GMK.Settlement || {};
GMK.Settlement.PaymentRequests = GMK.Settlement.PaymentRequests || {};

GMK.Settlement.PaymentRequests.start = function (data) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Settlement/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key"),
        balanceSettlementId: $routeElem.data("balancesettlementid"),
        contractCode: $routeElem.data("contractcode"),
        contractId: $routeElem.data("contractid"),
        feeRecordId: $routeElem.data("feerecordid"),
        appliedContractOnly: $routeElem.data("appliedcontractonly") === true,
        invoiceId: $routeElem.data("invoiceid"),
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Manage') {
            function _handleBasicSetting() {
                if (!viewModel.basicSettings.isValid()) return false;
                viewModel.basicSettings.notifySubscribers(true);
                return true;
            }
            function _handleContractConnection() {
                if (!viewModel.linkToContract.isValid()) return false;
                viewModel.linkToContract.notifySubscribers(true);
                return true;
            };
            function _handleInvoiceConnection() {
                if (!viewModel.linkToInvoice.isValid()) return false;
                viewModel.linkToInvoice.notifySubscribers(true);
                return true;
            };
            function _handleLogisitcsFee() {
                if (!viewModel.logisticsFee.isValid()) return false;
                viewModel.logisticsFee.notifySubscribers(true);
                return true;
            }
            $('#OutRecordWizard').bootstrapWizard({
                tabClass: 'nav',
                onNext: function ($activeTab, $navigation, nextIndex) {
                    var currentHref = $($activeTab.children('a')[0]).attr('href');
                    switch (currentHref) {
                        case '#BasicSettingsStep':
                            return _handleBasicSetting();
                        case '#ContractConnectionStep':
                            return _handleContractConnection();
                        case '#InvoiceConnectionStep':
                            return _handleInvoiceConnection();
                        case '#LogisticsFeeStep':
                            return _handleLogisitcsFee();
                    }
                    var isLast = $(this.nextSelector).hasClass('finish');
                    if (isLast) viewModel.savePayRequestRecord();
                    return !isLast;
                },
                onTabClick: function ($activeTab, $navigation, currentIndex, clickedIndex) {
                    if (clickedIndex == currentIndex) return false;
                    var currentHref = $($activeTab.children('a')[0]).attr('href');
                    switch (currentHref) {
                        case '#BasicSettingsStep':
                            return _handleBasicSetting();
                        case '#ContractConnectionStep':
                            return _handleContractConnection();
                        case '#InvoiceConnectionStep':
                            return _handleInvoiceConnection();
                        case '#LogisticsFeeStep':
                            return _handleLogisitcsFee();
                    }
                },
                onFixNavigationButton: function (opts) {
                    if (opts.isLast) $('#SaveAndPrint').addClass('in').show();
                    else $('#SaveAndPrint').removeClass('in').hide();
                }
            });
            var viewModel = new GMK.Settlement.PaymentRequests.ManageWizardViewModel(models, {
                balanceSettlementId: route.balanceSettlementId,
                contractId: route.contractId,
                invoiceId: route.invoiceId,
                feeRecordId: route.feeRecordId,
                loadUrl: route.baseUrl + 'GetPaymentRequest',
                loadKey: route.key,
                searchContractsUrl: route.baseUrl + 'GetContracts',
                searchInvoicesUrl: route.baseUrl + 'ListCommercialInvoices',
                getInvoiceData: route.baseUrl + 'GetCommercialInvoice',
                getFeeInfoUrl: route.baseUrl + 'GetFeeInfo',
                saveUrl: route.baseUrl + 'SavePaymentRequest',
                listFeeRecordsUrl: 'CostManagement/ListFeeRecords',
                getFeeRecordUrl: 'CostManagement/GetFeeRecord',
                editWarehouseUrl: data.editWarehouseUrl,
                editCustomerUrl: data.editCustomerUrl,
                requestCreateUrl: data.requestCreateUrl,
                paymentRequestsUrl: data.paymentRequestsUrl,
                payData: data.payData,
                rateData: data.rateData,
                isForeign: window.tradeType & models.Enums.SimpleTradeType.Foreign,
                isEdit : !!route.key,
            });
            //  window.vm = viewModel;
            viewModel.commonModels.registerQueryFormEvent();
            viewModel.commonModels.registerQueryFormEvent('#logistics-fee-collapse-query');
            viewModel.commonModels.registerQueryFormEvent('#logistics-fee-collapse-query');
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.basicSettings.payPurposeType(null); //这两行代码解决默认无法选中对应radiobtn的bug
            viewModel.basicSettings.payPurposeType('1');
        } else if (route.action == 'List') {
            var viewModel = new GMK.Settlement.PaymentRequests.ListViewModel(models, {
                searchUrl: route.baseUrl + 'ListPaymentRequests',
                deleteUrl: route.baseUrl + 'DeletePaymentRequest',
                setStatusUrl: route.baseUrl + 'SetRequestStatus',
                deleteAmountRecordUrl: route.baseUrl + 'DeletePaymentRecord',
                editUrl: data.editUrl,
                query: data.query,
                isForeign: window.tradeType & models.Enums.SimpleTradeType.Foreign,
            });
            //  window.vm = viewModel;
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            viewModel.initialize(data.query);
           // models.registerStateChange();
        }
    });
};

GMK.Settlement.PaymentRequests.ListViewModel = function (models, options) {
    var self = $.extend(this, models);

    self.findBankByPayPurposeType = function (bankId, customerId, payPurposeType) {
        var customers, customer;
        switch (payPurposeType) {
            case models.Enums.PayPurposeType.MainTrade:
                customers = self._AllCustomers.concat(self._AllLogistics).concat(self._AllCorporations);
                break;
            case models.Enums.PayPurposeType.WarehouseFee:
                customers = models._AllWarehouseWarehouses;
                break;
            case models.Enums.PayPurposeType.LogisticsFee:
                customers = models._AllLogistics;
                break;
        }
        customer = models.findById(customers, customerId);
        if (customer) {
            return self.findById(customer.accounts, bankId) || { id: '', number: '', bank: '', address: '', type: '' };
        } else {
            return { id: '', number: '', bank: '', address: '', type: '' };
        }
    };
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        this.customers = ko.observableArray(models._AllCustomers);
        this.query = ko.mapping.fromJS(options.query);
        this.queried = ko.observable();
        this.payRequestTypes = ko.observableArray($.grep(models.EnumOptions.PayPurposeType, function (r) {
            return r.value != models.Enums.PayPurposeType.FirePriceMargin;
        }));
        this.detailTypes = ko.computed(function () {
            var tradeType = window.tradeType;
            var payPurposeType = self.query.PayPurposeType();
            var detailTypes = $.map($.grep(models.EnumRelations.Amount, function (r) {
                return r.PayPurposeType == payPurposeType && r.TradeType & tradeType;
            }), function (r) { return r.AmountDetailObjectType });

            return $.grep(models.EnumOptions.AmountDetailObjectType, function (r) {
                if ($.inArray(r.value, detailTypes) !== -1) {
                    return r;
                }
            }) || [];
        });
        this.query.PayPurposeType.subscribe(function (newVal) {
            var payPurposeTypes = models.Enums.PayPurposeType;
            switch (parseInt(newVal, 10)) {
                case payPurposeTypes.MainTrade:
                    if (!options.isForeign) {
                        vm.query.AmountDetailObjectType(models.Enums.AmountDetailObjectType.Contract);
                    } else {
                        vm.query.AmountDetailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice);
                    }
                    break;
                case payPurposeTypes.LogisticsFee:
                    vm.query.AmountDetailObjectType(models.Enums.AmountDetailObjectType.LogisticsFee);
                    break;
                case payPurposeTypes.WarehouseFee:
                    vm.query.AmountDetailObjectType(models.Enums.AmountDetailObjectType.WarehouseFee);
                    break;
            }
        });
        this.query.AmountDetailObjectType.subscribe(function (newVal) {
            var types = models.Enums.AmountDetailObjectType;
            switch (newVal) {
                case types.Contract:
                case types.CommercialInvoice:
                    vm.customers(models._AllCustomers.concat(models._AllCorporations));
                    break;
                case types.WarehouseFee:
                    vm.customers(models._AllWarehouses);
                    break;
                case types.LogisticsFee:
                    vm.customers(models._AllLogistics);
                    break;
                default:
                    vm.customers(models._AllCustomers.concat(models._AllCorporations));
                    break;
            }
        });

        vm.requestList = ko.observableArray();
        vm.RemarkNote = ko.observable();
        vm.pageSummary = {
            Amount: ko.computed(function () {
                var sum = 0;
                $.each(vm.requestList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.Amount));
                });
                return sum;
            }),
            ActualCurrencyAmount: ko.computed(function () {
                var sum = 0;
                $.each(vm.requestList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.ActualCurrencyAmount));
                });
                return sum;
            }),
            showActualAmount: ko.computed(function () {
                if (self.queried() && self.queried().ActualCurrencyId)
                    return true;
                return false;
            }),
            showAmount: ko.computed(function () {
                if (self.queried() && self.queried().CurrencyId)
                    return true;
                return false;
            }),
            actualCurrency: ko.computed(function () {
                if (self.queried() && self.queried().ActualCurrencyId)
                    return models.findById(models.AllCurrencies, self.queried().ActualCurrencyId);
            }),
            currency: ko.computed(function () {
                if (self.queried() && self.queried().CurrencyId)
                    return models.findById(models.AllCurrencies, self.queried().CurrencyId);
            }),
        };
        vm.searchSummary = ko.observable({});
        vm.fill = function (result) {
            vm.requestList.removeAll();
            for (var i = 0; i < result.Data.list.length; i++) {
                result.Data.list[i].ApplyStatus = ko.observable(result.Data.list[i].Status);
                result.Data.list[i].approvalStatus = ko.observable(result.Data.list[i].ApprovalStatus);
                result.Data.list[i].actualCurrency = models.findById(models.AllCurrencies, result.Data.list[i].ActualCurrencyId);
                result.Data.list[i].currency = models.findById(models.AllCurrencies, result.Data.list[i].CurrencyId);
                vm.requestList.push(result.Data.list[i]);
            }
            vm.searchSummary(result.Data.summary);
            base._p(result.Data.pagination, options.searchUrl, vm.fill, function () {
                var param = ko.mapping.toJS(self.query);
                if (param.AmountDetailObjectType == models.Enums.AmountDetailObjectType.Contract) {
                    param.CommercialInvoiceCode = null;
                } else if (param.AmountDetailObjectType == models.Enums.AmountDetailObjectType.CommercialInvoice) {
                    param.ContractCode = null;
                }
                return param;
            });
        }
    }
    viewModel.call(this);

    this.findCustomer = function (payPurposeType, customerId) {
        return models.findCompany(customerId);
        //switch (payPurposeType) {
        //    case models.Enums.PayPurposeType.WarehouseFee:
        //        return models.findWarehouse(customerId);
        //    case models.Enums.PayPurposeType.LogisticsFee:
        //        return models.findLogistics(customerId);
        //    default:
        //        return models.findById(models.AllCustomers.concat(models.AllCorporations), customerId).name;
        //}
    };

    self._search = function () {
        var param = ko.mapping.toJS(self.query);
        if (param.AmountDetailObjectType == models.Enums.AmountDetailObjectType.Contract) {
            param.CommercialInvoiceCode = null;
        } else if (param.AmountDetailObjectType == models.Enums.AmountDetailObjectType.CommercialInvoice) {
            param.ContractCode = null;
        }
        base._get(options.searchUrl, param, function (data) {
            self.queried(param);
            self.fill(data);
        }, true);
    };

    self.onSearch = function () {
        self._search();
    };

    self.onEdit = function (item, event) {
        location.href = options.editUrl + '?' + $.param({ id: item.WFPayRequestId });
    };

    self.onCancelFinish = function (item, event) {
        confirm('确定要取消完成付款吗？', function () {
            base._post(options.setStatusUrl, { id: item.WFPayRequestId, status: models.Enums.PayRequestStatus.Initial }, function (result) {
                self._search();
            });
        });
    };

    self.onFinish = function (item, event) {
        confirm('确定要完成付款吗？', function () {
            base._post(options.setStatusUrl, { id: item.WFPayRequestId, status: models.Enums.PayRequestStatus.Finished }, function (result) {
                self._search();
            });
        });
    };

    self.toCancelFlow = function (item) {
        self.currItem = item;
        self.RemarkNote('');
    };

    self.onCancelFlow = function (modal) {
        return function () {
            confirm('确定要撤销？', function () {
                base._post('WorkflowMessage/RequestCancelByObject', {
                    objectId: self.currItem.WFPayRequestId,
                    flowType: models.Enums.ApprovalType.PayRequest,
                    note: self.RemarkNote()
                }, function (result) {
                    self.currItem.approvalStatus(models.Enums.ApprovalStatus.Cancelled);
                    $(modal).modal('hide');
                });
            });
        }
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFPayRequestId }, function () {
            var $elem = $(event.currentTarget).closest('tr');
            if ($elem) {
                $elem.remove();
            }
        });
    };

    self.initialize = function (query) {
        ko.mapping.fromJS(query, self.query);
        if (!self.query.CurrencyId()) { //仅有currencyId == null 时默认
            if (window.tradeType & models.Enums.SimpleTradeType.Domestic) { //内贸默认选择人民币
                self.query.CurrencyId(models.AllCurrencies[0].id);
               // self.query.ActualCurrencyId(models.AllCurrencies[0].id);
            } 
        }        
        self._search();
    }

    self.onDeleteAmountRecord = function (item, event) {
        if (item.WFAmountRecords[0]) {
            base._delete(options.deleteAmountRecordUrl, { id: item.WFAmountRecords[0].WFAmountRecordId }, function () {
                self._search();
            });
        } else {
            alert('对应付款记录不存在，请刷新后重试！');
            return false;
        }
    };
}

var BasicSettingChangeTopic = 'BasicSettingChange',
    LinkToContractTopic = 'LinkToContractChange',
    LinkToInvoiceTopic = 'LinkToInvoiceChange',
    OnInitializeTopic = 'OnInitialize',
    LogisticsFeeChangeTopic = 'LogisticsFeeChange',
    HasExchangeRateSetTopic = 'HasExchangeRateSetTopic';
GMK.Settlement.PaymentRequests.ManageWizardViewModel = function (models, options) {
    var base = GMK.Features.FeatureBase, utils = window.utils;
    var self = this;
    this.commonModels = models;
    this.approvalStatus = ko.observable();
    this.isEdit = !!options.loadKey;
    this.currencySetting = new GMK.Settlement.PaymentRequests.CurrencyViewModel(models, options);
    this.basicSettings = new BasicSettingsViewModel(models, options);
    this.linkToContract = new LinkToContractViewModel(models, options, this.currencySetting);
    this.linkToInvoice = new LinkToCommercialInvoiceViewModel(models, options, this.currencySetting);
    this.logisticsFee = new LogisitcsFeeViewModel(models, options, this.currencySetting);
    this.paymentRequest = new PaymentRequestViewModel(models, options);
    this.initialize = function () {
        var data;
        self.basicSettings.payPurposeType((models.Enums.PayPurposeType.MainTrade + ''));
        if (options.contractId) {
            base._get(options.searchContractsUrl, { contractId: options.contractId }, function (result) {
                PubSub.publishSync(OnInitializeTopic, {
                    contracts: result
                });
            });
            if (options.isForeign) {
                self.basicSettings.detailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice + '');
            } else {
                self.basicSettings.detailObjectType(models.Enums.AmountDetailObjectType.Contract + '');
            }
        } else if (options.balanceSettlementId) {
            base._get(options.searchContractsUrl, { balanceSettlementId: options.balanceSettlementId }, function (result) {
                PubSub.publishSync(OnInitializeTopic, {
                    contracts: result
                });
            });
        } else if (options.loadKey) {
            base._get(options.loadUrl, { id: options.loadKey }, function (result) {
                self.approvalStatus(result.Data.PayRequest.ApprovalStatus);
                PubSub.publishSync(OnInitializeTopic, {
                    record: result.Data.PayRequest,
                    association: result.Data.Association
                });
            });
        } else if (options.feeRecordId) {
            base._get(options.getFeeRecordUrl, { id: options.feeRecordId }, function (result) {
                PubSub.publishSync(OnInitializeTopic, {
                    feeRecord: result.data
                });
            });
        } else if (options.invoiceId) {
            base._get(options.getInvoiceData, { id: options.invoiceId }, function (result) {
                PubSub.publishSync(OnInitializeTopic, {
                    invoice: result.Data.item
                });
            });
            self.basicSettings.detailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice + '');
        }
    };
    this.save = function (callback) {
        var data = _getSaveData();
        if (!data) return;

        //判断最近一次账户信息是否不一致
        var params = {
            CustomerId: null,
            BankAccountId: self.paymentRequest.selectedAccout().id,
            CommodityId: null,
            DepartmentId: null,
            PayPurposeType: data.PayPurposeType,
            ExcludedPayRequestId: data.WFPayRequestId
        };
        switch (data.DetailObjectType) {
            case models.Enums.AmountDetailObjectType.Contract:
                params.CustomerId = (self.linkToContract.selectedContracts()[0] || {}).CustomerId;
                params.CommodityId = (self.linkToContract.selectedContracts()[0] || {}).CommodityId;
                params.DepartmentId = (self.linkToContract.selectedContracts()[0] || {}).DepartmentId;
                break;
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                params.CustomerId = (self.linkToInvoice.selectedItems()[0] || {}).WFInvoiceRecord.CustomerId;
                params.CommodityId = (self.linkToInvoice.selectedItems()[0] || {}).WFInvoiceRecord.CommodityId;
                // params.DepartmentId = (self.linkToInvoice.selectedItems()[0] || {}).DepartmentId;  //TODO：发票的账户重复性验证是否需要部门信息
                break;
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
                params.CustomerId = (self.logisticsFee.selectedLogisticsFees()[0] || {}).customerId;
                params.CommodityId = (self.logisticsFee.selectedLogisticsFees()[0] || {}).commodityId;
                break;
        }

        base._get('Settlement/GetPayRequestConsistency', params, function (result) {
            var msg;
            if (!result.Data.IsConsistent) {
                var account = result.Data.BankAccount;
                msg = '<div style="text-align:left;margin-left:10%;">本次付款账户：<strong class="label label-important">' + self.paymentRequest.selectedAccout().bank
                    + '</strong>(<strong>' + self.paymentRequest.selectedAccout().number + '</strong>)<br \>' +
                    '最近一次付款账户：<strong class="label label-important">' + account.BankName
                    + '</strong>(<strong>' + account.BankAccount + '</strong>)<br \>'
                    + '两次账户信息不一致，确定付款吗？</div>';
            } else {
                msg = '确定要向 <strong class="label label-important">{0}</strong> 的账户 <strong>{1}</strong> 付款吗？'.format(self.paymentRequest.selectedAccout().bank, self.paymentRequest.selectedAccout().number);
            }

            confirm(msg, function () {
                base._post(options.saveUrl, { entity: data }, function (result) {
                    if (callback) {
                        callback(result);
                    }
                });
            });

        });
    };
    this.back = base._back;
    this.savePayRequestRecord = function () {
        self.save(self.back);
    };
    this.onSaveAndPrint = function () {
        self.save(function (result) {
            var printUrl = GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({
                templateType: models.Enums.BillTemplateType.PayRequestBill,
                dataSourceId: result.Data.WFPayRequestId
            });
            var win = utils.openWindow();
            win.redirectTo(printUrl);
            self.back();
        });
    };
    this.onSaveAndReqestApprove = function () {
        self.save(function (result) {
            if (result.Data.approvable) {
                location.href = options.requestCreateUrl + '?' + $.param({
                    objectId: result.Data.WFPayRequestId,
                    flowType: models.Enums.ApprovalType.PayRequest,
                    redirect: options.paymentRequestsUrl
                });
            } else {
                utils.alert('保存成功，此单据不支持审批。', self.back);
                //setTimeout(self.back, 3000);
            }
        });
    };
    function _getSaveData() {
        if (!self.paymentRequest.isValid()) return;
        var data = self.paymentRequest.toJSON();
        switch (data.DetailObjectType) {
            case models.Enums.AmountDetailObjectType.Contract:
                data.WFPayRequestDetails = self.linkToContract.toJSON();
                break;
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                data.WFPayRequestDetails = self.linkToInvoice.toJSON();
                break;
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
                data.WFPayRequestDetails = self.logisticsFee.toJSON();
                break;
        }
        if (options.loadKey) data.WFPayRequestId = options.loadKey;
        return data;
    }
};
//付款类型选择Tab1
function BasicSettingsViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.payRequestTypes = ko.observableArray($.grep(models.EnumOptions.PayPurposeType, function (r) {
        return r.value != models.Enums.PayPurposeType.FirePriceMargin;
    }));

    this.payPurposeType = ko.observable(models.Enums.PayPurposeType.MainTrade + '');
    this.detailObjectType = ko.observable();

    this.detailTypes = ko.computed(function () {
        var tradeType = window.tradeType;
        var payPurposeType = self.payPurposeType();
        var detailTypes = $.map($.grep(models.EnumRelations.Amount, function (r) {
            return r.PayPurposeType == payPurposeType && r.TradeType & tradeType;
        }), function (r) { return r.AmountDetailObjectType });

        return $.grep(models.EnumOptions.AmountDetailObjectType, function (r) {
            if ($.inArray(r.value, detailTypes) !== -1) {
                return r;
            }
        }) || [];
    });

    this.detaiTypesVisible = ko.observable(true); //是否显示关联类别

    this.payPurposeType.subscribe(function (newVal) {
        var payPurposeTypes = models.Enums.PayPurposeType;
        switch (parseInt(newVal, 10)) {
            case payPurposeTypes.MainTrade:
                if (!options.isEdit) {
                    if (!options.isForeign) {
                        self.detailObjectType(models.Enums.AmountDetailObjectType.Contract + '');
                    } else {
                        self.detailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice + '');
                    }
                }
                self.detaiTypesVisible(true);
                break;
            case payPurposeTypes.LogisticsFee:
                if (!options.isEdit) {
                    self.detailObjectType(models.Enums.AmountDetailObjectType.LogisticsFee + '');
                }
                self.detaiTypesVisible(false);
                break;
            case payPurposeTypes.WarehouseFee:
                self.detaiTypesVisible(false);
                if (!options.isEdit) {
                    self.detailObjectType(models.Enums.AmountDetailObjectType.WarehouseFee + '');
                }
                break;
        }
    });

    var prevTab = 'ContractConnectionStep';
    this.detailObjectType.subscribe(function (newVal) {
        var detailObjectTypes = models.Enums.AmountDetailObjectType;
        switch (parseInt(newVal, 10)) {
            case detailObjectTypes.Contract:
                _switchTab('ContractConnectionStep');
                break;
            case detailObjectTypes.CommercialInvoice:
                _switchTab('InvoiceConnectionStep');
                break;
            case detailObjectTypes.LogisticsFee:
                _switchTab('LogisticsFeeStep');
                break;
            case detailObjectTypes.WarehouseFee:
                _switchTab('LogisticsFeeStep');
                break;
        }
        function _switchTab(cur) {
            if (prevTab == cur) return;
            $('#OutRecordWizard').bootstrapWizard('hide', 1);
            $('#OutRecordWizard .nav li:has([href="#{0}"]) > a'.format(prevTab)).attr('data-toggle', '');
            $('#OutRecordWizard .nav li:has([href="#{0}"]) > a'.format(cur)).attr('data-toggle', 'tab');
            $('#OutRecordWizard').bootstrapWizard('display', 1);
            prevTab = cur;
            $('#OutRecordWizard').bootstrapWizard('resetWizard');
        }
    });
    this.disable = ko.observable();

    this.isValid = function () {
        //  var v = parseInt(self.payPurposeType()), paymentType = models.Enums.PayPurposeType;
        return true;
    };

    this.notifySubscribers = function (isSync) {
        if (isSync) PubSub.publishSync(BasicSettingChangeTopic, _getPublishData());
        else PubSub.publish(BasicSettingChangeTopic, _getPublishData());
    };

    function _getPublishData() {
        return {
            payPurposeType: parseInt(self.payPurposeType(), 10),
            detailObjectType: parseInt(self.detailObjectType(), 10),
        };
    }

    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        _initialize(data);
    });

    function _initialize(data) {
        var costFeeType = models.Enums.CostFeeType;
        if (data.record) {
            self.payPurposeType(data.record.PayPurposeType);
            self.detailObjectType(data.record.DetailObjectType);
        }
        else if (data.feeRecord) {
            switch (data.feeRecord.wfSystemFee.feeType) {
                case costFeeType.WarehouseFee:
                    self.payPurposeType(models.Enums.PayPurposeType.WarehouseFee);
                    break;
                case costFeeType.Logistics:
                    self.payPurposeType(models.Enums.PayPurposeType.LogisticsFee);
                    break;
            }
        }
        self.notifySubscribers(true);
        self.disable(true);
    }
}
//合同列表选择tab2
function LinkToContractViewModel(models, options, currencySetting) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.selectedContracts = ko.observableArray();
    this.contractList = ko.observableArray();
    this.isBalanceSettlement = ko.observable(options.balanceSettlementId);
    this.contractQuery = {
        CustomerId: ko.observable(),
        CommodityId: ko.observable(),
        DepartmentId: ko.observable(),
        IsBuy: ko.observable(true),
        ContractCode: ko.observable(),
        CurrencyId: ko.observable(),
        ContractType: ko.observable(models.Enums.ContractTypeUIDetail.NormalContract),
        IncludeDiscountCost: ko.observable(false),
    };
    this.queryDisable = ko.observable(false);
    this.currencySetting = currencySetting;
    this.selectedCurrency = ko.computed(function () {
        if (self.selectedContracts().length > 0) {
            var currency = models.findById(models.AllCurrencies, self.selectedContracts()[0].CurrencyId);
            self.currencySetting.currencyId(self.selectedContracts()[0].CurrencyId);
            self.currencySetting.actualCurrencyId(self.selectedContracts()[0].CurrencyId);
            return currency;
        }
        return null;
    });
    this.onRemoveContract = function (item) {
        self.selectedContracts.remove(item);
        if (self.selectedContracts().length == 0) {
            self.queryDisable(false);
        } else
            self.queryDisable(true);
        utils.formatDecimal();
    };

    this.onPreSelectContracts = function () {
        var removed = [];
        $.each(self.contractList(), function (i, item) {
            if ($.grep(self.selectedContracts(), function (elem) {
                return elem.ContractCode == item.ContractCode;
            }).length) removed.push(item);
            else item.isSelected(false);
        });
        $.each(removed, function (i, item) {
            self.contractList.remove(item);
        });

        if (self.selectedContracts().length > 0) {
            var contract = self.selectedContracts()[0];
            self.contractQuery.CustomerId(contract.CustomerId);
            self.contractQuery.CommodityId(contract.CommodityId);
            self.contractQuery.DepartmentId(contract.DepartmentId);
            self.contractQuery.CurrencyId(contract.CurrencyId);
            self.contractQuery.IsBuy(contract.IsBuy);
            self.contractQuery.IncludeDiscountCost(contract.IsAmountIncludeDiscountCost);
            self.queryDisable(true);
        } else
            self.queryDisable(false);

        return true;
    };

    this.onSearchContracts = function () {
        var param = ko.mapping.toJS(self.contractQuery);
        base._get(options.searchContractsUrl, param, function (data) {
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(false);
            });
            data = $.grep(data, function (elem) {
                return $.grep(self.selectedContracts(), function (elem1) {
                    return elem1.ContractCode == elem.ContractCode;
                }).length == 0;
            });
            self.contractList(data);
        });
    };

    this.onSelectContract = function () {
        var result = $.grep(self.contractList(), function (item) {
            return item.isSelected();
        });
        var list = $.map(result, function (elem) {
            var item = new GMK.Settlement.NewContractViewModel(elem, models);
            // result.Amount(result.NotApplyAmount());
            item.ActualCurrencyAmount(item.NotApplyAmount());
            return item;
        });
        self.selectedContracts(list);

        if (self.selectedContracts().length == 0) {
            self.queryDisable(false);
        } else
            self.queryDisable(true);
        utils.formatDecimal();
        return true;
    };
    this.onCancelSelectContract = function () {
        return true;
    };

    this.notifySubscribers = function (isSync) {
        if (isSync) PubSub.publishSync(LinkToContractTopic, _getPublishData());
        else PubSub.publish(LinkToContractTopic, _getPublishData());
    };
    this.toJSON = function () {
        var result = [];
        var list = self.selectedContracts();
        for (var i = 0; i < list.length; i++) {
            if (list[i].Amount()) {
                result.push({
                    WFContractInfoId: list[i].WFContractInfoId,
                    ObjectId: list[i].WFContractInfoId,
                    ObjectType: models.Enums.AmountDetailObjectType.Contract,
                    Amount: utils.roundAmount(list[i].Amount()),
                    IsClearup: list[i].IsClearup(),
                    Price: list[i].prd.WithPrice() ? utils.roundAmount(list[i].prd.Price()) : null,
                    Weight: list[i].prd.WithPrice() ? utils.roundAmount(list[i].prd.Weight(), models.settings.weightDigits) : null,
                    Percentage: list[i].prd.WithPrice() ? list[i].prd.Percentage() : null,
                    ActualCurrencyAmount: utils.roundAmount(list[i].ActualCurrencyAmount())
                });
            }
        }
        return result;
    };
    this.isValid = function () {
        if (!self.selectedContracts().length) {
            alert('请查询并选择至少一个合同');
            return false;
        }
        var notSetRate = $.grep(self.selectedContracts(), function (r) {
            return r.isWarningMsgShow();
        });
        if (notSetRate.length > 0) {
            alert('结算币种和实际币种不一致，请设置汇率信息！');
            return false;
        }
        var amount = 0;
        $.each(self.selectedContracts(), function (i, item) {
            amount = amount + utils.parseFloat(item.Amount());
        });
        if (Math.abs(amount) < Math.Epsilon) {
            alert('请输入合同申请金额');
            return false;
        }
        return true;
    };

    function _getPublishData() {
        var amount = 0, actualCurrencyAmount = 0, currency = null, actualCurrency = null, exchangeRate = null;
        var customerId = self.selectedContracts().length > 0 ? self.selectedContracts()[0].CustomerId : null;
        $.each(self.selectedContracts(), function (i, item) {
            amount = amount + utils.parseFloat(item.Amount());
            actualCurrencyAmount = actualCurrencyAmount + utils.parseFloat(item.ActualCurrencyAmount());
        });
        currency = self.currencySetting.currency();
        actualCurrency = self.currencySetting.actualCurrency();
        exchangeRate = self.currencySetting.toJS();
        return {
            customer: customerId,
            contracts: self.selectedContracts(),
            totalAmount: amount,
            totalActualCurrencyAmount: actualCurrencyAmount,
            currency: currency,
            actualCurrency: actualCurrency,
            exchangeRate: exchangeRate,
            haveSetRate: self.currencySetting.isSetCurrencyRate(),
        };
    }

    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        _initialize(data);
    });

    function _fill(record, contracts) {
        var detail;
        $.each(contracts, function (i, item) {
            temp = new GMK.Settlement.NewContractViewModel(item, models);
            detail = $.grep(record.WFPayRequestDetails, function (elem) {
                return elem.WFContractInfoId == item.WFContractInfoId;
            })[0];
            temp.prd.Weight(detail.Weight);
            temp.prd.Price(detail.Price);
            temp.prd.PercentagePercent(detail.Percentage * 100);
            temp.CurrentApplyingAmount = detail.Amount;
            temp.isUserInput(options.isEdit);
            temp.Amount(detail.Amount);
            temp.ActualCurrencyAmount(detail.ActualCurrencyAmount);           

            self.selectedContracts.push(temp);
        });
    }

    function _initialize(data) {
        var temp;
        if (data.record) {
            if (data.record.DetailObjectType == models.Enums.AmountDetailObjectType.Contract) {
                self.isBalanceSettlement(!!data.record.WFSettlementRequestlId);
                _fill(data.record, data.association);
                self.currencySetting.fromJS(data.record);
                self.notifySubscribers(true);
            }
        } else if (data.contracts) { //新增时
            $.each(data.contracts, function (i, item) {
                temp = new GMK.Settlement.NewContractViewModel(item, models);
                if (options.balanceSettlementId) { //尾款结算过来的数据，全部反一下
                    temp.CurrentApplyingAmount = temp.ApplyingPaymentAmount;
                    temp.Amount(temp.WFSettlementRequestDetails[0].Amount *  -1);
                    temp.ActualCurrencyAmount(temp.WFSettlementRequestDetails[0].Amount * -1);
                } else {
                    var amount = temp.NotApplyAmount();
                    temp.Amount(amount);
                    temp.ActualCurrencyAmount(amount);
                }
                self.selectedContracts.push(temp);
            });
            self.notifySubscribers(true);
        }
    }
}

///发票付款列表选择tab2
function LinkToCommercialInvoiceViewModel(models, options, currencySetting) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.selectedItems = ko.observableArray();
    this.list = ko.observableArray();
    this.isBalanceSettlement = ko.observable(options.balanceSettlementId);
    this.query = {
        CustomerId: ko.observable(),
        CommodityId: ko.observable(),
        AccountingEntityId: ko.observable(),
        InvoiceCode: ko.observable(),
        CurrencyId: ko.observable(),
        IsReceive: ko.observable(true),
        InvoiceType: ko.observable(models.Enums.InvoiceType.CommercialInvoice),
        AvailableForAmount: ko.observable(true),
        IncludeDiscountCost: ko.observable(false),
        ContractCode: ko.observable(),
        IsAmountAboveZero : ko.observable(true),
    };
    this.accountingEntities = ko.computed(function () {
        var commodity = $.grep(models.AllCommodities, function (r) {
            return self.query.CommodityId() === r.id;
        });
        if (commodity.length > 0)
            return commodity[0].accountingEntities.slice();
        else
            return [];
    });
    this.queryDisable = ko.observable(false);
    this.currencySetting = currencySetting;
    this.selectedCurrency = ko.computed(function () {
        if (self.selectedItems().length > 0) {
            var invoice = self.selectedItems()[0];
            var currency = models.findById(models.AllCurrencies, invoice.WFInvoiceRecord.CurrencyId);
            self.currencySetting.currencyId(invoice.WFInvoiceRecord.CurrencyId);
            self.currencySetting.actualCurrencyId(invoice.WFInvoiceRecord.CurrencyId);
            return currency;
        }
        return null;
    });
    this.onRemove = function (item) {
        self.selectedItems.remove(item);
    };

    this.onPreSelect = function () {
        if (self.selectedItems().length > 0) {
            var invoice = self.selectedItems()[0];
            self.query.CustomerId(invoice.WFInvoiceRecord.CustomerId);
            self.query.CommodityId(invoice.WFInvoiceRecord.CommodityId);
            self.query.CurrencyId(invoice.WFInvoiceRecord.CurrencyId);
            self.query.AccountingEntityId(invoice.WFInvoiceRecord.AccountingEntityId);
            self.query.IncludeDiscountCost(invoice.WFInvoiceRecord.IsAmountIncludeDiscountCost);
        }
        return true;
    };

    this.onSearch = function () {
        var param = ko.mapping.toJS(self.query);
        base._get(options.searchInvoicesUrl, param, function (result) {
            self.list(result.Data.CommercialInvoices);
        });
    };

    this.onSelect = function (item) {
        item.WFInvoiceRecord.TotalAmount = item.WFInvoiceRecord.TotalAmount * (item.WFInvoiceRecord.IsReceive ? 1 : -1);    //从开票那边过来的发票金额为负    
        var result = new GMK.Settlement.NewInvoiceViewModel(item, models);
        result.ActualCurrencyAmount(result.NotApplyAmount());
        self.selectedItems([result]);
        utils.formatDecimal();
        return true;
    };
    this.onCancel = function () {
        return true;
    };

    this.notifySubscribers = function (isSync) {
        if (isSync) PubSub.publishSync(LinkToInvoiceTopic, _getPublishData());
        else PubSub.publish(LinkToInvoiceTopic, _getPublishData());
    };
    this.toJSON = function () {
        var result = [];
        var list = self.selectedItems();
        for (var i = 0; i < list.length; i++) {
            if (list[i].Amount()) {
                result.push({
                    WFContractInfoId: null,
                    ObjectType: models.Enums.AmountDetailObjectType.CommercialInvoice,
                    ObjectId: list[i].WFInvoiceRecordId,
                    Amount: utils.roundAmount(list[i].Amount()),
                    ActualCurrencyAmount: utils.roundAmount(list[i].ActualCurrencyAmount())
                });
            }
        }
        return result;
    };
    this.isValid = function () {
        if (!self.selectedItems().length) {
            alert('请查询并选择发票');
            return false;
        }
        var notSetRate = $.grep(self.selectedItems(), function (r) {
            return r.isWarningMsgShow();
        });
        if (notSetRate.length > 0) {
            alert('结算币种和实际币种不一致，请设置汇率信息！');
            return false;
        }
        var amount = 0;
        $.each(self.selectedItems(), function (i, item) {
            amount = amount + utils.parseFloat(item.Amount());
        });
        if (Math.abs(amount) < Math.Epsilon) {
            alert('请输入发票申请金额');
            return false;
        }
        return true;
    };

    function _getPublishData() {
        var amount = 0, actualCurrencyAmount = 0, currency = null, actualCurrency = null, exchangeRate = null;
        var customerId = self.selectedItems().length > 0 ? self.selectedItems()[0].WFInvoiceRecord.CustomerId : null;
        $.each(self.selectedItems(), function (i, item) {
            amount = amount + utils.parseFloat(item.Amount());
            actualCurrencyAmount = actualCurrencyAmount + utils.parseFloat(item.ActualCurrencyAmount());
        });
        currency = self.currencySetting.currency();
        actualCurrency = self.currencySetting.actualCurrency();
        exchangeRate = self.currencySetting.toJS();
        return {
            customer: customerId,
            invoices: self.selectedItems(),
            totalAmount: amount,
            totalActualCurrencyAmount: actualCurrencyAmount,
            currency: currency,
            actualCurrency: actualCurrency,
            exchangeRate: exchangeRate,
            haveSetRate: self.currencySetting.isSetCurrencyRate(),
        };
    }

    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        _initialize(data);
    });

    function _fill(record, invoices) {
        var detail, list = [];
        $.each(invoices, function (i, item) {
            item.WFInvoiceRecord.TotalAmount = item.WFInvoiceRecord.TotalAmount * (item.WFInvoiceRecord.IsReceive ? 1 : -1);
            var temp = new GMK.Settlement.NewInvoiceViewModel(item, models);
            detail = $.grep(record.WFPayRequestDetails, function (elem) {
                return elem.ObjectId == item.WFInvoiceRecordId;
            })[0];
            temp.isUserInput(options.isEdit);
            temp.Amount(detail.Amount);
            temp.ActualCurrencyAmount(detail.ActualCurrencyAmount);            
            list.push(temp);
        });
        self.selectedItems(list);
    }

    function _initialize(data) {
        var temp;
        if (data.record) {
            if (data.record.DetailObjectType == models.Enums.AmountDetailObjectType.CommercialInvoice) {
                self.isBalanceSettlement(!!data.record.WFSettlementRequestlId);
                _fill(data.record, data.association);
                self.currencySetting.fromJS(data.record);
                self.notifySubscribers(true);
            }
        } else if (data.invoice) {
            data.invoice.WFInvoiceRecord.TotalAmount = data.invoice.WFInvoiceRecord.TotalAmount * (data.invoice.WFInvoiceRecord.IsReceive ? 1 : -1);
            var result = new GMK.Settlement.NewInvoiceViewModel(data.invoice, models);
            result.ActualCurrencyAmount(result.NotApplyAmount());
            self.selectedItems([result]);
            self.notifySubscribers(true);
        } else if (data.contracts) { //外贸通过合同进入收发票
            var contract = data.contracts[0];
            if (contract) {
                self.query.CustomerId(contract.CustomerId);
                self.query.CommodityId(contract.CommodityId);
                self.query.CurrencyId(contract.CurrencyId);
                self.query.AccountingEntityId(contract.AccountingEntityId);
                self.query.IncludeDiscountCost(contract.IsAmountIncludeDiscountCost);
                self.query.ContractCode(contract.ContractCode);
                self.queryDisable(true);
            }
        }
    }
};
//费用列表选择tab2
function LogisitcsFeeViewModel(models, options, currencySetting) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.currencySetting = currencySetting;
    this.isBalanceSettlement = ko.observable(false);
    this.query = {
        CurrencyId: ko.observable(),
        CommodityId: ko.observable(),
        CustomerId: ko.observable(),
        FeeSysTypeType: ko.observable(),
        DateRange: ko.observable(),
        LogisticsCompanyId: ko.observable(),
        WarehouseId: ko.observable(),
    };

    this.payPurposeType = ko.observable();
    self.payPurposeType.subscribe(function (newVal) {
        self.logisticsFeeList.removeAll();
        self.selectedLogisticsFees.removeAll();
        switch (self.payPurposeType()) {
            case models.Enums.PayPurposeType.LogisticsFee:
                self.query.FeeSysTypeType(models.Enums.CostFeeType.Logistics);
                break;
            case models.Enums.PayPurposeType.WarehouseFee:
                self.query.FeeSysTypeType(models.Enums.CostFeeType.WarehouseFee);
                break;
        }
    });
    this.logisticsFeeList = ko.observableArray();
    this.selectedLogisticsFees = ko.observableArray([]);
    this.selectedCurrency = ko.computed(function () {
        if (self.selectedLogisticsFees().length > 0) {
            var currency = models.findById(models.AllCurrencies, self.selectedLogisticsFees()[0].currencyId);
            self.currencySetting.currencyId(self.selectedLogisticsFees()[0].currencyId);
            self.currencySetting.actualCurrencyId(self.selectedLogisticsFees()[0].currencyId);
            return currency;
        }
        return null;
    });
    this.onSearchLogisticsFees = function () {
        var data = ko.mapping.toJS(self.query);
        switch (self.payPurposeType()) {
            case models.Enums.PayPurposeType.LogisticsFee:
                data.CustomerId = data.LogisticsCompanyId;
                break;
            case models.Enums.PayPurposeType.WarehouseFee:
                data.CustomerId = data.WarehouseId;
                break;
        }
        base._get(options.listFeeRecordsUrl, data, function (result) {
            var data = $.grep(result.data, function (item) {
                return $.grep(self.selectedLogisticsFees(), function (elem) {
                    return elem.wfFeeRecordId == item.wfFeeRecordId;
                }).length == 0;
            });
            $.each(data, function (i, item) {
                item.isSelected = ko.observable();
            });
            self.logisticsFeeList(data);
        });
    };
    this.onSelectLogisiticsFees = function () {
        var result = [];
        $.each(self.logisticsFeeList(), function (i, item) {
            if (item.isSelected()) {
                var data = new GMK.Settlement.NewFeeRecordViewModel(item, models);
                data.Amount(item.amount);
                result.push(data);
            }
        });
        this.query.CustomerId(result[0].customerId);
        this.query.CommodityId(result[0].commodityId);
        self.selectedLogisticsFees(result);
        utils.formatDecimal();
    };
    this.onRemoveLogisticsFee = function (item) {
        self.selectedLogisticsFees.remove(item);
        utils.formatDecimal();
    };

    this.toJSON = function () {
        return $.map(self.selectedLogisticsFees(), function (item) {
            return {
                Amount:utils.roundAmount( item.Amount()),
                ActualCurrencyAmount: utils.roundAmount(item.ActualCurrencyAmount()),
                ObjectId: item.wfFeeRecordId || item.wfFeeRecordId,
                ObjectType: self.payPurposeType() == models.Enums.PayPurposeType.LogisticsFee ?
                    models.Enums.AmountDetailObjectType.LogisticsFee : models.Enums.AmountDetailObjectType.WarehouseFee,
            };
        });
    };

    this.notifySubscribers = function (isSync) {
        if (isSync) PubSub.publishSync(LogisticsFeeChangeTopic, _getPublishData());
        else PubSub.publish(LogisticsFeeChangeTopic, _getPublishData());
    };

    this.isValid = function () {
        if (!self.selectedLogisticsFees().length) {
            alert('请选择至少一条费用记录');
            return false;
        }
        var notSetRate = $.grep(self.selectedLogisticsFees(), function (r) {
            return r.isWarningMsgShow();
        });
        if (notSetRate.length > 0) {
            alert('结算币种和实际币种不一致，请设置汇率信息！');
            return false;
        }
        return true;
    };

    function _getPublishData() {
        var amount = 0, actualCurrencyAmount = 0, currency = null, actualCurrency = null, exchangeRate = null;
        var customerId = self.selectedLogisticsFees().length > 0 ? self.selectedLogisticsFees()[0].customerId : null;
        $.each(self.selectedLogisticsFees(), function (i, item) {
            amount = amount + utils.parseFloat(item.Amount());
            actualCurrencyAmount = actualCurrencyAmount + utils.parseFloat(item.ActualCurrencyAmount());
        });
        currency = self.currencySetting.currency();
        actualCurrency = self.currencySetting.actualCurrency();
        exchangeRate = self.currencySetting.toJS();
        return {
            customer: customerId,
            fees: self.selectedLogisticsFees(),
            totalAmount: amount,
            totalActualCurrencyAmount: actualCurrencyAmount,
            currency: currency,
            actualCurrency: actualCurrency,
            exchangeRate: exchangeRate,
            haveSetRate: self.currencySetting.isSetCurrencyRate(),
        };
    };

    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        _initialize(data);
    });

    PubSub.subscribe(BasicSettingChangeTopic, function (msg, data) {
        self.payPurposeType(data.payPurposeType);
    });

    function _initialize(data) {
        if (data.feeRecord) {
            var item = new GMK.Settlement.NewFeeRecordViewModel(data.feeRecord, models);
            item.Amount(item.amount);
            temp.ActualCurrencyAmount(item.Amount);
            self.selectedLogisticsFees.push(item);
            self.notifySubscribers(true);
        } else if (data.record) {
            if (data.record.PayPurposeType == models.Enums.PayPurposeType.WarehouseFee ||
                data.record.PayPurposeType == models.Enums.PayPurposeType.LogisticsFee) {
                self.selectedLogisticsFees($.map(data.association, function (item) {
                    var result = {};
                    for (prop in item) result[prop.toTitleCase()] = item[prop];
                    var temp = new GMK.Settlement.NewFeeRecordViewModel(result, models);
                    $.each(data.record.WFPayRequestDetails, function (i, detail) {
                        if (detail.ObjectId == temp.wfFeeRecordId) {
                            temp.isUserInput(options.isEdit);
                            temp.Amount(detail.Amount);
                            temp.ActualCurrencyAmount(detail.ActualCurrencyAmount);
                            return true;
                        }
                    });
                    return temp;
                }));
                self.currencySetting.fromJS(data.record);
                self.notifySubscribers(true);
            }
        }
    }
}

//付款详情信息填写 tab3
function PaymentRequestViewModel(models, options) {
    var self = $.extend(this, ko.mapping.fromJS(options.payData));
    var base = GMK.Features.FeatureBase;
    var contracts;
    this.selectedCustomer = ko.observable();
    this.selectedCustomerAccounts = ko.observableArray();
    this.selectedAccout = ko.observable();

    // this.salers = ko.observableArray();
    this.accountEntities = ko.observableArray();
    this.configCustomerUrl = ko.computed(function () {
        var url, payPurposeType = models.Enums.PayPurposeType;
        switch (self.PayPurposeType()) {
            case payPurposeType.MainTrade:
                url = options.editCustomerUrl;
                break;
            case payPurposeType.WarehouseFee:
            case payPurposeType.LogisticsFee:
                url = options.editWarehouseUrl;
                break;
        }
        return url + '/' + (self.selectedCustomer() || {}).id;
    });

    this.isPopoverVisible = ko.observable();
    this.departmentId = ko.observable();

    this.currency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.CurrencyId());
    });
    this.actualCurrency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.ActualCurrencyId());
    });

    this.CompanyBankInfoId.subscribe(function (newVal) {
        $.each(self.selectedCustomerAccounts(), function (i, item) {
            if (item.id == newVal) {
                self.selectedAccout(item);
                return false;
            }
        });
    });
    this.selectedCustomer.subscribe(function (newCustomer) {
        if (newCustomer) {
            var accounts = [];
            var bId;
            var query = {
                tradeType: !options.loadKey ? window.tradeType : self.TradeType(),
                corporationId: !options.loadKey ? window.corporationId : self.CorporationId(),
                commodityId: self.CommodityId(),
            };
            if (newCustomer.accounts.length > 0){
                accounts = models.ListCompanyBankAccounts({
                    accounts: newCustomer.accounts,
                    bussinessParam: query,
                });                
            }
            self.selectedCustomerAccounts(accounts || []);
            self.isPopoverVisible(accounts.length == 0);
            //$.each(accounts, function (i, item) {
            //    if (item.type == 1) {
            //        self.CompanyBankInfoId(item.id);
            //        return false;
            //    }
            //});
        }
    });
    //this.SalerId.subscribe(function (newVal) {
    //    self.accountEntities(models.findAccountEntities(contracts[0].CommodityId, newVal));
    //});
    this.toJSON = function () {
        var result = ko.mapping.toJS(self);
        result.PayCustomerId = self.selectedCustomer().id;
        if (options.balanceSettlementId) result.WFSettlementRequestlId = options.balanceSettlementId;
        return result;
    };
    this.isValid = function () {
        if ($('#BankAccount').find('option:selected').text().trim() === '') {
            alert('汇入账号为空，请重新选择');
            return false;
        }
        return $('#PaymentRequestForm').valid();
    };

    PubSub.subscribe(BasicSettingChangeTopic, function (msg, data) {
        var paymentType = models.Enums.PayPurposeType, currentCustomer;
        self.PayPurposeType(data.payPurposeType);
        self.DetailObjectType(data.detailObjectType);
    });
    PubSub.subscribe(LinkToContractTopic, function (msg, data) {
        var contracts = data.contracts;
        //self.salers(models.findSalers(contracts[0].CommodityId));
        self.CommodityId(contracts && contracts.length ? contracts[0].CommodityId : null);
        self.departmentId(contracts && contracts.length ? contracts[0].DepartmentId : null);
        currentCustomer = models._findCompany(data.customer);
        if (!self.selectedCustomer() || self.selectedCustomer().id != currentCustomer.id) self.selectedCustomer(currentCustomer);
        amountSetFromSelect(data);
        if (!options.loadKey)
            self.PayType(contracts && contracts.length ? contracts[0].WFSettleOption.PaymentFormType : null);
    });
    PubSub.subscribe(LinkToInvoiceTopic, function (msg, data) {
        var invoices = data.invoices;
        self.CommodityId(invoices && invoices.length ? invoices[0].WFInvoiceRecord.CommodityId : null);
        self.departmentId(invoices && invoices.length ? invoices[0].WFInvoiceRecord.DepartmentId : null); //发票没有departmentId
        if (!options.loadKey) {
            self.PayType(invoices && invoices.length ? invoices[0].WFInvoiceRecord.PaymentFormType : null);
            self.CompanyBankInfoId(invoices && invoices.length ? invoices[0].BeneficiaryBankAccountId : null);
        }
        var currentCustomer = models._findCompany(data.customer);
        if (!self.selectedCustomer() || self.selectedCustomer().id != currentCustomer.id) self.selectedCustomer(currentCustomer);

        amountSetFromSelect(data);
    });
    PubSub.subscribe(LogisticsFeeChangeTopic, function (msg, data) {
        var currentCustomer = models._findCompany(data.customer);
        //switch (self.PayPurposeType()) {
        //    case models.Enums.PayPurposeType.LogisticsFee:
        //        currentCustomer = models.findById(models.AllLogistics, data.customer);
        //        break;
        //    case models.Enums.PayPurposeType.WarehouseFee:
        //        currentCustomer = models.findById(models.AllWarehouses, data.customer);
        //        break;
        //}
        if (!self.selectedCustomer() || self.selectedCustomer().id != currentCustomer.id) self.selectedCustomer(currentCustomer);
        amountSetFromSelect(data);
    });
    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        _initialize(data);
    });

    function amountSetFromSelect(data) {
        self.Amount(utils.roundAmount(data.totalAmount));
        self.ActualCurrencyAmount(utils.roundAmount(data.totalActualCurrencyAmount));
        if (data.haveSetRate) {
            self.ExchangeRate = ko.mapping.fromJS(data.exchangeRate);
        } else {
            self.ExchangeRate = null;
            self.ExchangeRateId = null;
        }
        self.CurrencyId(data.currency.id);
        self.ActualCurrencyId(data.actualCurrency.id);
    }

    function _initialize(data) {
        var record = data.record;
        if (!record) return;
        ko.mapping.fromJS(record, self);
        var currentCustomer = models._findCompany(data.record.CustomerId); //强制设置，刷新银行账户信息
        self.selectedCustomer(currentCustomer);
    }
}

function _detailsCurrencyInit(root, models, isAmountToActaul) {
    root.Amount = ko.observable();
    root.ActualCurrencyAmount = ko.observable(0);
    root.isWarningMsgShow = ko.observable(false); //显示用户设置汇率信息
    root.isAmountToActaul = isAmountToActaul; //true 从amount计算actualAmount

    root.isUserInput = ko.observable(false); //是否需要启用系统计算

    root.exchangeRate = {
        currencyId: ko.observable(),
        actualCurrencyId: ko.observable(),
        isRateSet: ko.observable(false),
        pair: {},
        exchangeRate: {},
    };

    root.onSetUserInput = function () {
        root.isUserInput(!root.isUserInput());
        if (!root.isUserInput()) {
            autoCompted();
        }
    };

    PubSub.subscribe(HasExchangeRateSetTopic, function (msg, data) {
        var exchangeRate = data.exchangeRate, currencyId = data.currencyId, actualCurrencyId = data.actualCurrencyId;
        var isRateSet = data.isRateSet;
        var pair = models.findById(models.AllCurrencyPairs, exchangeRate.WFCurrencyPairId);
        root.exchangeRate.currencyId(currencyId);
        root.exchangeRate.actualCurrencyId(actualCurrencyId);
        root.exchangeRate.pair = pair;
        root.exchangeRate.exchangeRate = exchangeRate;
        root.exchangeRate.isRateSet(isRateSet);
        if (data.isClearRate) {
            root.isUserInput(false);
        }
        if (currencyId == actualCurrencyId) {
            root.isUserInput(false);
        }
        if (!root.isUserInput()) {
            autoCompted();
        }        
    });
    root.ActualCurrencyAmount.subscribe(function (newVal) {
        if (!root.isAmountToActaul && !root.isWarningMsgShow() && !root.isUserInput()) {
            if (!isNaN(newVal)) {
                if (root.exchangeRate.isRateSet()) {
                    var amount = 0;
                    if (root.exchangeRate.currencyId() == root.exchangeRate.pair.baseCurrencyId) {
                        amount = utils.parseFloat(newVal) * (utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount)
                            / utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount));
                    } else
                        amount = utils.parseFloat(newVal) * (utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount)
                            / utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount));
                    root.Amount(utils.roundAmount(amount));
                } else
                    root.Amount(newVal);
            }
        }
        utils.formatDecimal();
    });

    function autoCompted() {
        var amount = 0, actualAmount = root.ActualCurrencyAmount();
        if (!root.exchangeRate.isRateSet() && root.exchangeRate.currencyId() != root.exchangeRate.actualCurrencyId()) { //未设置汇率并且币种不一致
            root.isWarningMsgShow(true);
        } else {
            root.isWarningMsgShow(false);
            if (root.isAmountToActaul) {
                if (root.exchangeRate.isRateSet() && root.exchangeRate.exchangeRate && !isNaN(root.Amount())) {
                    if (root.exchangeRate.currencyId() == root.exchangeRate.pair.baseCurrencyId) {
                        amount = utils.parseFloat(root.Amount()) / (utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount) / utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount));
                    } else
                        amount = utils.parseFloat(root.Amount()) / (utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount) / utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount));
                    root.ActualCurrencyAmount(utils.roundAmount(amount));
                } else
                    root.ActualCurrencyAmount(root.Amount());
            } else {
                if (root.exchangeRate.isRateSet() && root.exchangeRate.exchangeRate && !isNaN(actualAmount)) {
                    if (root.exchangeRate.currencyId() == root.exchangeRate.pair.baseCurrencyId) {
                        amount = utils.parseFloat(actualAmount) * (utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount) / utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount));
                    } else
                        amount = utils.parseFloat(actualAmount) * (utils.parseFloat(root.exchangeRate.exchangeRate.CounterAmount) / utils.parseFloat(root.exchangeRate.exchangeRate.BaseUnitAmount));
                    root.Amount(utils.roundAmount(amount));
                } else
                    root.Amount(actualAmount);
            }
        }
        utils.formatDecimal();
    }
};

//合同类型的发票详情信息
GMK.Settlement.NewContractViewModel = function (contract, commonModels) {
    var self = this;
    $.extend(self, contract);
    _detailsCurrencyInit(this, commonModels, false);
    this.CurrentApplyingAmount = 0;
    this.IsClearup = ko.observable(false);
    this.HasApplyAmount = ko.computed(function () {
        if (contract.IsBuy) { //采购
            return utils.roundAmount(contract.ApplyingPaymentAmount - self.CurrentApplyingAmount + utils.parseFloat(self.Amount()));
        } else {
            return utils.roundAmount(contract.AmountHappened + self.CurrentApplyingAmount - utils.parseFloat(self.Amount()));
        }
    });
    this.NotApplyAmount = ko.computed(function () {
        return utils.roundAmount(contract.AmountActualTotal - self.HasApplyAmount());
    });
    this.prd = {
        Weight: ko.observable(),
        PercentagePercent: ko.observable(100),
        Price: ko.observable()
    };
    this.prd.Percentage = ko.computed(function () {
        return self.prd.PercentagePercent() / 100;
    });
    this.prd.AmountComputed = ko.computed(function () {
        var amount = (self.prd.Weight() * self.prd.Price() * self.prd.Percentage()) || 0;
        self.Amount(utils.roundAmount(amount) || null);
    });
    this.prd.WithPrice = ko.computed(function () {
        return self.ContractType == commonModels.Enums.ContractType.FirePricing || self.ContractType == commonModels.Enums.ContractType.LongContractDetail;
    });
};

//商业发票类型的详情信息
GMK.Settlement.NewInvoiceViewModel = function (invoice, commonModels) {
    var self = this;
    $.extend(self, invoice);
    _detailsCurrencyInit(this, commonModels, false);
    this.IsClearup = ko.observable(false);
    this.HasApplyAmount = ko.computed(function () {
        return utils.roundAmount(invoice.TotalHappendAmount + utils.parseFloat(self.Amount()));
    });
    this.NotApplyAmount = ko.computed(function () {
        return utils.roundAmount(invoice.WFInvoiceRecord.TotalAmount - self.HasApplyAmount());
    });
};

GMK.Settlement.NewFeeRecordViewModel = function (fee, commonModels) {
    var self = $.extend(this, fee);
    _detailsCurrencyInit(this, commonModels, true);
};

GMK.Settlement.ContractViewModel = function (contract, commonModels) {
    var self = this;
    $.extend(self, contract);
    self.Amount = ko.observable();
    self.OldAmount = ko.observable(0);
    self.IsClearup = ko.observable(false);

    self.getNoApplyingPaymentAmount = function () {
        var result = utils.roundAmount((self.IsBuy ? utils.roundAmount(self.AmountActualTotal) : -(utils.roundAmount(self.AmountActualTotal))) - utils.roundAmount(self.ApplyingPaymentAmount));
        return result;
    };

    self.HasApplyAmount = ko.observable();
    self.NotApplyAmount = ko.observable();

    var calcApplyAmount = function (p_amount, p_oldamount) {
        var v_amount = isNaN(p_amount) ? '0' : (((p_amount || '0') + '') || '0');
        var v_oldamount = isNaN(p_oldamount) ? '0' : (((p_oldamount || '0') + '') || '0');
        var amount = new BigDecimal(utils.roundAmount(v_amount).toString());
        var oldamount = new BigDecimal(utils.roundAmount(v_oldamount).toString());
        var applyamount = new BigDecimal(utils.roundAmount(self.ApplyingPaymentAmount).toString());
        var amounttotal = new BigDecimal(utils.roundAmount(self.AmountActualTotal).toString());

        var hasapplyamount = applyamount.add(amount).subtract(oldamount);
        var notapplyamount = amounttotal.subtract(hasapplyamount);
        if (!self.IsBuy) {
            hasapplyamount = new BigDecimal("0").subtract(hasapplyamount);
            notapplyamount = new BigDecimal("0").subtract(notapplyamount);
        }
        self.HasApplyAmount(hasapplyamount.toString());
        self.NotApplyAmount(notapplyamount.toString());
    };
    self.OldAmount.subscribe(function (val) {
        calcApplyAmount(self.Amount(), val);
    });
    self.Amount.subscribe(function (val) {
        calcApplyAmount(val, self.OldAmount());
    });

    self.AmountComputed = ko.computed({
        read: function () {
            return self.IsBuy ? self.Amount() : (-self.Amount() || self.Amount());
        },
        write: function (val) {
            if (self.prd.WithPrice()) {
                var price = utils.roundAmount(self.prd.Price());
                if (price * self.prd.Percentage()) {
                    var weight = utils.roundAmount(val) / (price * self.prd.Percentage());
                    self.prd.Weight(utils.roundAmount(weight, 4));
                }
            }
            self.Amount(self.IsBuy ? val : (-val || val));
        }
    });

    self.prd = {};
    self.prd.Weight = ko.observable();
    self.prd.Price = ko.observable();
    self.prd.PercentagePercent = ko.observable(100);
    self.prd.Percentage = ko.computed(function () {
        return self.prd.PercentagePercent() / 100;
    });
    self.prd.AmountComputed = ko.computed(function () {
        var amount = (self.prd.Weight() * self.prd.Price() * self.prd.Percentage()) || 0;
        self.Amount(utils.roundAmount(amount) || null);
    });
    self.prd.WithPrice = ko.computed(function () {
        return self.ContractType == commonModels.Enums.ContractType.FirePricing || self.ContractType == commonModels.Enums.ContractType.LongContractDetail;
    });
};

GMK.Settlement.PaymentRequests.CurrencyViewModel = function (models, options) {
    var self = this;
    this.item = ko.mapping.fromJS(options.rateData);
    this.isSetCurrencyRate = ko.observable(false);
    this.currencyId = ko.observable();
    this.actualCurrencyId = ko.observable();
    this.firstLoad = ko.observable(true);
    this.isClearRate = ko.observable(false);

    this.currencyPair = ko.computed(function () {
        return models.findById(models.AllCurrencyPairs, self.item.WFCurrencyPairId());
    });
    this.currency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.currencyId());
    });
    this.actualCurrency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.actualCurrencyId());
    });

    this.actualCurrencyId.subscribe(function (newVal) {
        self._pubSubData();
    });
    this.availableCurrencyPairs = ko.computed(function () {
        if (self.currencyId() && self.actualCurrencyId())
            return $.grep(models.AllCurrencyPairs, function (r) {
                return (r.baseCurrencyId == self.currencyId() && r.counterCurrencyId == self.actualCurrencyId()) ||
                      (r.counterCurrencyId == self.currencyId() && r.baseCurrencyId == self.actualCurrencyId())
            });
        else
            return [];
    });

    var _methods = {
        onPreSetRate: function () {
            if (!self.isSetCurrencyRate()) {
                self.item.BaseUnitAmount((self.currencyPair() || {}).defaultBaseUnitAmountForUserInput);
                self.item.CounterAmount(null);
            }
            return true;
        },
        onSetRate: function () {
            self.isSetCurrencyRate(true);
            self._pubSubData();
            return true;
        },
        onClearRate: function () {
            self.isSetCurrencyRate(false);
            self.isClearRate(true);
            ko.mapping.fromJS(options.rateData, self.item);
            self.actualCurrencyId(self.currencyId());
            //self._pubSubData();
        },
        onChangePairs: function (data, e) {
            self.item.BaseUnitAmount((self.currencyPair() || {}).defaultBaseUnitAmountForUserInput);
            self.item.CounterAmount(null);
        },
        toJS: function () {
            if (self.isSetCurrencyRate()) {
                var data = ko.mapping.toJS(self.item);
                return data;
            }
        },
        fromJS: function (record) {
            var exchangeData = record.ExchangeRate;
            self.currencyId(record.CurrencyId);
            self.actualCurrencyId(record.ActualCurrencyId);
            if (exchangeData.WFExchangeRateId != 0) {
                self.isSetCurrencyRate(true);
            } else
                self.isSetCurrencyRate(false);
            ko.mapping.fromJS(exchangeData, self.item);
            self._pubSubData();
        },
        _pubSubData: function () {
            PubSub.publish(HasExchangeRateSetTopic, {
                isRateSet: self.isSetCurrencyRate(),
                exchangeRate: ko.mapping.toJS(self.item),
                currencyId: self.currencyId(),
                actualCurrencyId: self.actualCurrencyId(),
                isClearRate: self.isClearRate(),
            });
        },
    };
    $.extend(this, _methods);
};
