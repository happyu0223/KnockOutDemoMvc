/**
* create by amy
* create date 2015-08-31
*/
"use strict";
var ns = utils.namespace('GMK.CommercialInvoice.CommercialInvoices');

ns.start = function (data) {
    var baseUrl = 'CommercialInvoice/';
    GMK.Features.CommonModels.onReady(function (models) {
        models.findCurrencyCode = function (id) {
            var currency = models.findById(models.AllCurrencies, id);
            return currency == null ? null : currency.shortName;
        };
        var viewModel;
        viewModel = new ns.ManageViewModel(models, data, {
            saveUrl: baseUrl + 'SaveInvoice',
            getUrl: baseUrl + 'GetInvoice',
            searchContractUrl: baseUrl + 'SearchContract',
            loadContractUrl: baseUrl + 'GetContracts',
            loadTempInvoicesUrl: baseUrl + 'GetTempInvoicesByContract',
            generateInvoiceCodeUrl: baseUrl + 'GenerateInvoiceCode',
            isReceive: (data.isReceive + '').toLowerCase() == 'true' ? true : false,
            detailItem: data.detailItem,
            data: data.data,
            isCreate: !data.id,
            editCustomerUrl: data.editCustomerUrl,
            invoiceObject: data.invoiceObject,
        });

        function _initializeData() {
            viewModel.initialize(data);
            function _handleBasicSetting() {
                if (!viewModel.basicSettings.isValid()) return false;
                viewModel.basicSettings.notifySubscribers();
                return true;
            }
            function _handleDetailSetting() {
                if (!viewModel.detailSettings.isValid()) return false;
                viewModel.detailSettings.notifySubscribers();
                if (viewModel.detailSettings.isCurrencyConflict()) { //是否显示币种tab
                    $('#CommercialInvoiceWizard .nav li:has([data-toggle!="tab"]) > a').attr('data-toggle', 'tab');
                    viewModel.setStepVisible(3, true);
                } else {
                    viewModel.setStepVisible(3, false);
                    $('#CommercialInvoiceWizard .nav li:has([data-toggle="tab"]):eq(3) > a').attr('data-toggle', '');
                }
                return true;
            }
            function _handleAdvancedSetting() {
                if (!viewModel.advancedSettings.isValid()) return false;
                viewModel.advancedSettings.notifySubscribers();
                return true;
            }
            function _handleExchangeRateSetting() {
                if (!viewModel.exchangeRateSettings.isValid()) return false;
                viewModel.exchangeRateSettings.notifySubscribers();
                return true;
            }
            $('#CommercialInvoiceWizard').bootstrapWizard({
                tabClass: 'nav',
                onNext: function ($activeTab, $navigation, nextIndex) {
                    var currentHref = $($activeTab.children('a')[0]).attr('href');
                    switch (currentHref) {
                        case '#BasicSettingsStep':
                            if (!_handleBasicSetting()) return false;
                            break;
                        case '#DetailSettingsStep':
                            if (!_handleDetailSetting()) return false;
                            break;
                        case '#AdvancedSettingsStep':
                            if (!_handleAdvancedSetting()) return false;
                            break;
                        case '#ExchangeRateSettingsStep':
                            if (!_handleExchangeRateSetting()) return false;
                            break;
                    }
                    var isLast = $(this.nextSelector).hasClass('finish');
                    if (isLast) viewModel.saveInvoiceRecord();
                    return !isLast;
                },
                onTabClick: function ($activeTab, $navigation, currentIndex, clickedIndex) {
                    if (clickedIndex == currentIndex) return false;
                    var currentHref = $($activeTab.children('a')[0]).attr('href');
                    switch (currentHref) {
                        case '#BasicSettingsStep':
                            return _handleBasicSetting();
                        case '#DetailSettingsStep':
                            return _handleDetailSetting();
                        case '#AdvancedSettingsStep':
                            return _handleAdvancedSetting();
                        case '#ExchangeRateSettingsStep':
                            return _handleExchangeRateSetting();
                    }
                },
                onFixNavigationButton: function (opts) {

                }
            });
            viewModel.setStepVisible(3, false);
            $('#CommercialInvoiceWizard .nav li:has([data-toggle="tab"]):eq(3) > a').attr('data-toggle', '');
        }
        _initializeData();
        ko.applyBindings(viewModel);
        viewModel.commonModels.registerQueryFormEvent();
    });
};

var _OnAfterSelectData = "selectDataDone",
    _OnInitializedBasicSetting = "basicSettingIsDone",
    _OnInitializedDetailSetting = "detailSettingIsDone",
    _OnInitializedAdvancedSetting = "advancedSettingIsDone",
    _OnLoadTempInvoiceDone = "loadTempInvoicesAndInitIsDone",
    _OnSelectTempInvoiceDone = "selectTempInvoiceIsDone",
    _OnLoadDiscountDataFromContract = "hasLoadDiscountDataFromContract";
var _selectModelType = { //选择时的数据类型
    contract: 'ContractInfo',
    invoice: 'InvoiceInfo',
    entryRecord: 'EntryRecord',
    outRecord: 'OutRecord',
};

var _newDetailsType = { //发票的详情type
    nomalNew: 'NomalNewDetail',
    invoice: 'InvoiceInfoDetail',
    entryRecord: 'EntryRecordDetail',
    outRecord: 'OutRecordDetail',
};

ns.ManageViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.commonModels = models;
    this.isCreate = !values.id;
    this.basicSettings = new BasicSettingsViewModel(models, options);
    this.detailSettings = new InvoiceRecordViewModel(models, options);
    this.advancedSettings = new AdvancedSettingsViewModel(models, options);
    this.exchangeRateSettings = new ExchangeRateSettingsViewModel(models, options);
    this.steps = ko.observableArray([this.basicSettings, this.detailSettings, this.advancedSettings, this.exchangeRateSettings]);

    this.currentStep = ko.observable(this.basicSettings);
    this.lastStep = ko.computed(function () {
        return self.steps().filter(function (r) {
            return r.visible();
        }).slice(-1)[0];
    });
    this.setStepVisible = function (index, visible) {
        self.steps()[index].visible(visible);
        $('#CommercialInvoiceWizard').bootstrapWizard(visible ? 'display' : 'hide', index);
    };

    var _methods = {
        initialize: function () {
            if (self.isCreate) {
                if (!values.contractId) {
                    self.basicSettings.initialize(null, null, values.tempInvoiceId);
                } else {
                    self.basicSettings.initialize(null, [values.contractId], values.tempInvoiceId);
                }
                self.detailSettings.initialize(null, values.tempInvoiceId);
            } else {
                base._get(options.getUrl, { id: values.id }, function (result) {
                    var data = result.data.item;
                    data.isFinal = data.isFinal + '';
                    data.isBalance = data.isBalance + '';
                    self.basicSettings.initialize(data, [data.wfContractInfoId], null);
                    self.detailSettings.initialize(data);
                    self.advancedSettings.initialize(data);
                    self.exchangeRateSettings.initialize(data);
                });
            }
        },
        toJS: function () {
            var item = self.detailSettings.toJS();
            var amountData = self.advancedSettings.toJS();
            $.each(amountData, function (name, value) {
                if (name != 'unitId' && name != 'currencyId')
                    item[name] = value;
            });

            if ((item.isFinal + '').toLowerCase() == 'true') { //status = final;final data = temp data

            }
            // if (self.detailSettings.isCurrencyConflict()) { //无论币种是否一致，都添加关联表记录
            var exchangeData = self.exchangeRateSettings.toJS();
            exchangeData.objectId = item.wfContractInfoId;
            exchangeData.wfInvoiceRecordId = item.wfInvoiceRecordId;
            exchangeData.objectType = models.Enums.InvoiceDetailObjectType.Contract;
            exchangeData.weight = item.totalWeight;
            if (!self.detailSettings.isCurrencyConflict()) { //币种一致默认同步金额信息
                exchangeData.invoiceCurrencyFutureValue = item.totalAmount;
                exchangeData.invoiceCurrencyPresentValue = item.totalAmount - item.discountCost;
                exchangeData.objectCurrencyFutureValue = item.totalAmount;
                exchangeData.objectCurrencyPresentValue = item.totalAmount - item.discountCost;
                exchangeData.objectCurrencyId = item.currencyId;
                exchangeData.exchangeRate = null;
            }
            var hasData = false;
            $.each(item.wfInvoiceObjects || [], function (i, r) {
                if (r.wfInvoiceObjectId == exchangeData.wfInvoiceObjectId) {
                    hasData = true;
                    item.wfInvoiceObjects[i] = exchangeData;
                    return;
                }
            });
            if (!hasData) {
                item.wfInvoiceObjects.push(exchangeData);
            }

            return item;
        },
        saveInvoiceRecord: function () {
            var data = self.toJS();
            base._post(options.saveUrl, data, function () {
                if (self.isCreate && values.tempInvoiceId) { //从预结算页面过来的新增，直接返回列表页面
                    window.location.href = values.indexUrl;
                } else
                    History.back();
            });
        },
    };
    $.extend(this, _methods);
};

/**
* wizard第一个tab 关联对应合同并选择发票类型
*/
function BasicSettingsViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.visible = ko.observable(true);
    this.isFinal = ko.observable('false');
    this.isBalance = ko.observable('false');
    this.btnDisable = ko.observable(false);
    this.selectTypeDisable = ko.observable(false);
    var isBasicSettingsSeted = false; // 是否已经选择合同等信息，不用重复订阅和通知
    this.selectContractViewModel = new ns.SelectContractViewModel(models, options);

    this.isFinal.subscribe(function (newVal) {
        if (newVal == 'false') {
            self.isBalance('false');
        }
    });

    var _methods = {
        isValid: function () {
            if (this.selectContractViewModel.selectedItems().length == 0) {
                alert('请选择合同记录');
                return false;
            }
            return true;
        },
        initialize: function (data, contractIds, tempInvoiceId) {
            if (data) {
                self.isFinal((data.isFinal + '').toLowerCase());
                self.isBalance((data.isBalance + '').toLowerCase());
                self.selectTypeDisable(true);
            }
            self.selectContractViewModel.initialize(contractIds);
            if (contractIds)
                self.btnDisable(true);

            if (tempInvoiceId) { //作为默认最终结算发票的对应临时发票的id信息
                self.isFinal('true');
                self.isBalance('true');
                self.selectTypeDisable(true);
            }
        },
        onPreSearch: function () { //打开选择框前根据现有数据预处理一些数据 
            return true;
        },
        disableHander: function (disable) {
            self.btnDisable(disable);
            self.selectTypeDisable(disable);
        },
        notifySubscribers: function () {
            self.disableHander(true);
            var contract = self.selectContractViewModel.selectedItems()[0];
            if (!isBasicSettingsSeted) { //only first time notify
                PubSub.publish(_OnInitializedBasicSetting, {
                    isFinal: self.isFinal(),
                    isBalance: self.isBalance(),
                    contract: contract,
                });
                isBasicSettingsSeted = true;

                if (options.isCreate && models.isNotSightBillType(contract.wfSettleOption.paymentFormType) && models.isForLcBillType(contract.wfSettleOption.paymentFormType)) { //远期并且LC
                    var data = (contract.wfSettleOption.wfSettleOptionDetails[0] || {}).wfSettleOptionDetailPaymentForm.wfSodPfExchangeBill;
                    if (data)
                        PubSub.publish(_OnLoadDiscountDataFromContract, {
                            discountDays: data.discountDays,
                            discountRate: data.discountRate,
                            floatInterestType: data.floatInterestType,
                        });
                }
            }
        },
    };
    $.extend(this, _methods);
};
/**
* wizard第二个tab 填写发票基本信息和详情
* 输入 合同*1 发票类型
* 返回发票类
*/
function InvoiceRecordViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.visible = ko.observable(true);
    this.item = ko.mapping.fromJS(options.data);
    this.contractDetailsViewModel = new ContractInvoiceDetailsViewModel(models, options);
    this.invoiceDetailsViewModel = new TempInvoiceDetailsViewModel(models, options);

    var paymentTypeWithoutLc = $.grep(models.EnumOptions.PaymentFormType, function (r) {
        return r.value != models.Enums.PaymentFormType.LetterOfCreditsBankDemandDraft && r.value != models.Enums.PaymentFormType.LetterOfCreditsBankAcceptanceBill;
    });
    var paymentTypeLc = $.grep(models.EnumOptions.PaymentFormType, function (r) {
        return r.value == models.Enums.PaymentFormType.LetterOfCreditsBankDemandDraft || r.value == models.Enums.PaymentFormType.LetterOfCreditsBankAcceptanceBill;
    });

    this.paymentTypes = ko.observableArray(paymentTypeWithoutLc);
    this.preAmountSet = ko.observable(false);
    this.signDate = ko.observable();
    this.currencyIdDisable = ko.observable(false);
    this.item.exchangeProcessType.subscribe(function (newVal) {
        var types = models.Enums.ExchangeProcessType;
        switch (newVal) {
            case types.DocumentsAgainstPayment:
                self.item.paymentFormType(models.Enums.PaymentFormType.CommercialDraftAtSight);
                self.paymentTypes(paymentTypeWithoutLc);
                break;
            case types.DocumentsAgainstAcceptance:
                self.item.paymentFormType(models.Enums.PaymentFormType.CommercialAcceptanceBill);
                self.paymentTypes(paymentTypeWithoutLc);
                break;
            case types.LetterOfCredit:
                self.paymentTypes(paymentTypeLc);
                break;
            case types.AmountFirst:
            case types.SpotFirst:
            case types.FaceToFace:
                self.item.paymentFormType(models.Enums.PaymentFormType.TelegraphicTransfer);
                self.paymentTypes(paymentTypeWithoutLc);
                break;
            default:
                self.paymentTypes(paymentTypeWithoutLc);
        }
    });

    this.detailType = ko.computed(function () {
        if ((self.item.isFinal() + '').toLowerCase() == 'false') {
            return _newDetailsType.nomalNew;
        } else {
            if ((self.item.isBalance() + '').toLowerCase() == 'false') {
                return _newDetailsType.nomalNew;
            }
            if ((self.item.isBalance() + '').toLowerCase() == 'true') {
                return _newDetailsType.invoice;
            }
        }
    });
    this.isContractView = ko.computed(function () { //是否是默认添加detail方式
        return !(self.item.isBalance() == 'true' && self.item.isFinal() == 'true');
    });

    //是否存在跨币种
    this.contractCurrencyId = ko.observable();
    this.isCurrencyConflict = ko.computed(function () {
        return self.contractCurrencyId() && self.contractCurrencyId() != self.item.currencyId();
    });

    var _methods = {
        isValid: function () {
            switch (self.detailType()) {
                case _newDetailsType.nomalNew:
                    if (self.contractDetailsViewModel.details().length == 0) {
                        alert('至少添加一条发票明细记录！');
                        return false;
                    }
                    break;
                case _newDetailsType.invoice:
                    if (self.invoiceDetailsViewModel.toJS().length == 0) {
                        alert('至少选择一条临时发票记录！');
                        return false;
                    }
                    break;
            }
            return $('#InvoiceForm').valid();
        },
        disableHander: function (disable) {

        },
        notifySubscribers: function () {
            self.disableHander(true);
            switch (self.detailType()) {
                case _newDetailsType.nomalNew:
                    PubSub.publish(_OnInitializedDetailSetting, {
                        item: self.toJS(),
                        summary: ko.mapping.toJS(self.contractDetailsViewModel.detailSummary),
                        contractCurrencyId: self.contractCurrencyId(),
                    });
                    break;
                case _newDetailsType.invoice:
                    PubSub.publish(_OnInitializedDetailSetting, {
                        item: self.toJS(),
                        summary: ko.mapping.toJS(self.invoiceDetailsViewModel.detailSummary),
                        contractCurrencyId: self.contractCurrencyId(),
                    });
                    //如果是临时发票并存在币种问题，新增时默认取第一条数据的汇率信息
                    if (self.isCurrencyConflict() && options.isCreate) {
                        var invoice = self.invoiceDetailsViewModel.toJS()[0];
                        var exchangeData = $.grep(invoice.wfInvoiceObjects || [], function (r) {
                            return r.objectType == models.Enums.InvoiceDetailObjectType.Contract;
                        });
                        if (exchangeData.length > 0)
                            PubSub.publish(_OnSelectTempInvoiceDone, {
                                exchangeRate: exchangeData[0].exchangeRate,
                                invoiceCurrencyId: invoice.currencyId,
                                contractCurrencyId: exchangeData[0].objectCurrencyId,
                            });
                    }
                    break;
            }
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            switch (self.detailType()) {
                case _newDetailsType.nomalNew:
                    data.wfContractInvoices = ko.mapping.toJS(self.contractDetailsViewModel.details());
                    break;
                case _newDetailsType.invoice:
                    data.wfContractInvoices = [];
                    data.tempCommercialInvoices = self.invoiceDetailsViewModel.toJS();
                    break;
            }
            return data;
        },
        initializeFromContract: function (data) {
            if (options.isCreate) {
                self.item.isFinal(data.isFinal);
                self.item.isBalance(data.isBalance);
                self.item.customerId(data.contract.customerId);
                self.item.currencyId(data.contract.currencyId);
                self.item.commodityId(data.contract.commodityId);
                self.item.unitId(data.contract.unitId);
                self.item.wfContractInfoId(data.contract.wfContractInfoId);
                self.item.wfContractInfo(data.contract);
                if (self.item.isFinal() == 'true' && self.item.isBalance() == 'true') { //最终结算发票的货款方式为电汇
                    self.item.exchangeProcessType(paymentTypeWithoutLc[0].id);
                    self.item.paymentFormType(models.Enums.PaymentFormType.TelegraphicTransfer);
                } else {
                    self.item.exchangeProcessType(data.contract.wfSettleOption ? data.contract.wfSettleOption.exchangeProcessType : null);
                    self.item.paymentFormType(data.contract.wfSettleOption ? data.contract.wfSettleOption.paymentFormType : null);
                }
            }
            self.signDate(data.contract.signDate);
            self.contractCurrencyId(data.contract.currencyId);
            switch (self.detailType()) {
                case _newDetailsType.nomalNew:
                    self.contractDetailsViewModel.initialize(data.contract.commodityId, data.contract.currencyId);
                    break;
                case _newDetailsType.invoice:
                    if (options.isCreate) //如果是编辑，初始化时已经load过相关数据
                        self.invoiceDetailsViewModel.loadList(data.contract.wfContractInfoId);
                    self.invoiceDetailsViewModel.initialize(data.contract.commodityId, data.contract.currencyId);
                    break;
            }
            self.validateInit();
        },
        initialize: function (data, tempInvoiceId) {
            if (data) {
                ko.mapping.fromJS(data, self.item);
                self.item.paymentFormType(data.paymentFormType);
                switch (self.detailType()) {
                    case _newDetailsType.nomalNew:
                        self.contractDetailsViewModel.details($.map(data.wfContractInvoices, function (r) {
                            return ko.mapping.fromJS(r);
                        }));
                        break;
                    case _newDetailsType.invoice:
                        self.invoiceDetailsViewModel.initSelectedList($.map(data.tempCommercialInvoices, function (r) {
                            return r.wfInvoiceRecordId;
                        }), false); //编辑时是否可以修改对应的关联的临时发票记录？可以：changeable = true;不可以changeable=false
                        self.invoiceDetailsViewModel.loadList(data.wfContractInfoId, data.tempCommercialInvoices);
                        break;
                }
            }
            if (tempInvoiceId) {
                self.invoiceDetailsViewModel.initSelectedList([tempInvoiceId], false);
                self.currencyIdDisable(true);
            }
        },
        validateInit: function () {
            jQuery.validator.addMethod("isOpenDateGreater", function (value, element) {
                return this.optional(element) || self.openDateCheck(value, new Date(), false);
            }, function () {
                return options.isReceive ? "收票日期不得晚于当前日期！" : '开票日期不得晚于当前日期！';
            });
            jQuery.validator.addMethod("isOpenDateSmaller", function (value, element) {
                return this.optional(element) || self.openDateCheck(value, self.signDate(), true);
            }, function () {
                return options.isReceive ? "收票日期不得早于合同签订日期！" : '开票日期不得早于合同签订日期！';
            });

            $("#InvoiceForm").validate({
                rules: {
                    OpenDate: {
                        isOpenDateGreater: true,
                        isOpenDateSmaller: true
                    },
                    ReceiveDate: {
                        isOpenDateGreater: true,
                        isOpenDateSmaller: true
                    }
                },
            });
        },
        openDateCheck: function (value, compareDate, greaterCompare) {
            if (greaterCompare)
                return utils.compareDate(value, compareDate);
            else
                return utils.compareDate(compareDate, value);
        },
        onGenerateInvoiceCode: function () {
            base._get(options.generateInvoiceCodeUrl, { contractId: self.item.wfContractInfoId(), isFinal: self.item.isFinal() }, function (data) {
                //  var $invoiceCodeElem = $(event.currentTarget).prev().val(data.result);
                self.item.invoiceCode(data.result);
            });
        },
    };
    $.extend(this, _methods);

    PubSub.subscribe(_OnInitializedBasicSetting, function (msg, data) {
        self.initializeFromContract(data);
    });

    PubSub.subscribe(_OnLoadTempInvoiceDone, function (msg, data) {
        self.invoiceDetailsViewModel.onSelectCurrencyId(self.item.currencyId());
        self.item.currencyId.subscribe(self.invoiceDetailsViewModel.onSelectCurrencyId); //初始化币种选择联动
        if (data.selectedList && data.selectedList.length > 0) { //默认设置币种
            self.item.currencyId(data.selectedList[0].currencyId);
        }
        //选择临时记录后，不可编辑币种
        self.autoComputedTempInvoice = ko.computed(function () {
            var selected = $.grep(self.invoiceDetailsViewModel.list(), function (r) {
                return r.isChecked();
            });
            if (selected.length > 0)
                self.currencyIdDisable(true);
            else
                self.currencyIdDisable(false);
        });
    });
};

/**
* wizard第三个tab 填写发票的款项信息
* 输入 发票 发票详情
* 输出 发票 + 款项信息
*/
function AdvancedSettingsViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.visible = ko.observable(true);

    this.customerId = ko.observable();
    this.corporationId = ko.observable();
    this.isReceive = ko.observable();
    this.paymentFormType = ko.observable();
    this.currentCustomer = ko.observable();
    this.configCustomerUrl = ko.observable("#");
    this.contractCurrencyId = ko.observable();
    //用于查找银行账户
    this.business = {
        tradeType: ko.observable(),
        corporationId: ko.observable(),
        commodityId: ko.observable(),
    };
    this.item = {
        totalWeight: ko.observable(),
        totalGrossWeight: ko.observable(),
        totalAmount: ko.observable(),
        totalBundles: ko.observable(),
        unitId: ko.observable(),
        currencyId: ko.observable(),
        isAmountIncludeDiscountCost: ko.observable(false),
        discountCost: ko.observable(),
        avgPrice: ko.observable(),
        totalTempInvoicesHappendAmount: ko.observable(), //已发生总款项
        correspondentBank: ko.observable(),
        beneficiaryBankAccountId: ko.observable(),
        discountRate: ko.observable(),
        //  discountRatio: ko.observable(),
        discountDays: ko.observable(),
        annualDays: ko.observable(360),
    };

    this.item.discountRatio = ko.computed(function () {
        if (self.item.discountRate() && !isNaN(self.item.discountRate())
            && self.item.discountDays() && !isNaN(self.item.discountDays())
            && self.item.annualDays() && !isNaN(self.item.annualDays())) {
            return utils.discount.computeRdtByRdannual(utils.parseFloat(self.item.discountRate()),
               utils.parseFloat(self.item.discountDays()), utils.parseFloat(self.item.annualDays()),
               utils.discount.COMPUTE_OPTION.ROUGH);
        }
        return null;
    });

    //存储tab2带入的信息
    this.totalAmount = ko.observable(0);
    this.totalBundles = ko.observable(0);

    this.isUserInput = ko.observable(false); //是否是用户输入的信息
    this.needShowHappedAmount = ko.observable(false); //是否需要显示剩余款项信息
    this.banksFromServer = ko.observableArray([]); //记录点击刷新获取的数据信息

    this.item.isAmountIncludeDiscountCost.subscribe(function (newVal) {
        if (!newVal) {
            self.item.discountRate(null);
            self.item.discountDays(null);
        }
    });

    this.showWarningMsg = ko.computed(function () {
        return utils.parseFloat(self.totalAmount()) - utils.parseFloat(self.item.totalAmount()) > 0;
    });
    this.autoCompute = ko.computed(function () { //自动计算一部分信息
        if (!self.isUserInput()) {
            if (self.item.isAmountIncludeDiscountCost()) {
                if (self.item.discountRatio()) {
                    var amount = utils.parseFloat(self.totalAmount()) / (1 - self.item.discountRatio()); //票面金额=货款/(1-r%)
                    self.item.totalAmount(utils.roundAmount(amount));
                    self.item.discountCost(utils.roundAmount(self.item.totalAmount() - self.totalAmount()));
                } else {
                    self.item.totalAmount(null);
                    self.item.discountCost(null);
                }
            } else {
                self.item.totalAmount(utils.roundAmount(utils.parseFloat(self.totalAmount())));
            }
        }

        if (self.item.totalAmount() && !isNaN(self.item.totalAmount()))
            self.item.avgPrice(utils.roundAmount(utils.parseFloat(self.item.totalAmount()) / utils.parseFloat(self.item.totalWeight())));
        //utils.formatDecimal();
    });
    //银行账户信息
    this.customerBanks = ko.computed(function () {
        var customer = null, isCustomer = true, customerId;
        if (!self.isReceive()) { //收票：默认法人的账户，如果是
            isCustomer = false;
            if (self.needShowHappedAmount() && (utils.parseFloat(self.item.totalAmount()) - self.item.totalTempInvoicesHappendAmount()) < 0) //最终结算发票取剩余金额
                isCustomer = true;
            if (!self.needShowHappedAmount() && utils.parseFloat(self.item.totalAmount()) < 0)
                isCustomer = true;
        } else {
            isCustomer = true;
            if (self.needShowHappedAmount() && (utils.parseFloat(self.item.totalAmount()) - self.item.totalTempInvoicesHappendAmount()) < 0) //最终结算发票取剩余金额
                isCustomer = false;
            if (!self.needShowHappedAmount() && utils.parseFloat(self.item.totalAmount()) < 0)
                isCustomer = false;
        }
        customerId = isCustomer ? self.customerId() : (options.isCreate ? window.corporationId : self.corporationId());
        if (customerId) {
            customer = models._findCompany(customerId);
        }
        if (customer) {
            self.currentCustomer(customer);
            self.configCustomerUrl(options.editCustomerUrl + '/?id=' + customer.id);
            if (customer.accounts.length > 0) {
                // if (isCustomer) { //如果是法人，不需要进行银行账户的业务权限排除
                var accounts = models.ListCompanyBankAccounts({
                    accounts: customer.accounts,
                    bussinessParam: ko.mapping.toJS(self.business),
                });
                if (accounts.length > 0)
                    return accounts;
            }
        }
        return models.ListCompanyBankAccounts({
            accounts: self.banksFromServer(),
            bussinessParam: ko.mapping.toJS(self.business),
        });
    });
    this.correspondentBank = ko.computed(function () {
        return models.findById(self.customerBanks(), self.item.correspondentBank());
    });
    this.beneficiaryBankAccount = ko.computed(function () {
        return models.findById(self.customerBanks(), self.item.beneficiaryBankAccountId());
    });
    //TT的支付方式下，付款行必填
    this.isBeneficiaryBankRequired = ko.computed(function () {
        if (self.paymentFormType())
            return self.paymentFormType() === models.Enums.PaymentFormType.TelegraphicTransfer;
        return false;
    });

    var _methods = {
        isValid: function () {
            if (self.item.isAmountIncludeDiscountCost()) {
                if (utils.parseFloat(self.item.discountCost()) - utils.parseFloat(self.item.totalAmount()) > 0) {
                    alert('票面金额应该大于贴现成本！');
                    return false;
                }
            }
            //if (self.needShowWarning()) {
            //    if (_confirm("当前输入的票面金额和系统计算的票面金额不一致，确定继续操作？")) {
            //        return $('#AdvancedFrom').valid();
            //    }
            //} else
            return $('#AdvancedFrom').valid();
        },
        initialize: function (data) { //编辑时，总金额重新计算，贴现成本和贴现率的信息带入
            self.item.isAmountIncludeDiscountCost(data.isAmountIncludeDiscountCost);
            self.item.discountCost(data.discountCost);
            self.item.currencyId(data.currencyId);
            self.item.unitId(data.unitId);
            self.isUserInput(true);
            self.item.totalAmount(data.totalAmount + data.totalTempInvoicesHappendAmount); //显示时，总金额为计算所得
            self.item.totalBundles(data.totalBundles);
            self.item.totalGrossWeight(data.totalGrossWeight);
            self.item.totalTempInvoicesHappendAmount(data.totalTempInvoicesHappendAmount);
            self.item.discountCost(data.discountCost);
            self.item.discountDays(data.discountDays);
            self.item.discountRate(data.discountRate);
            self.item.annualDays(data.annualDays);
        },
        notifySubscribers: function () {
            PubSub.publish(_OnInitializedAdvancedSetting, {
                contractCurrencyId: self.contractCurrencyId(),
                invoiceCurrencyId: self.item.currencyId(),
                totalValue: self.totalAmount(),
                amountItem: self.toJS(),
            });
        },
        initializeFromDetail: function (data) {
            //记录tab2传递的值
            self.totalAmount(data.summary.totalAmount);
            self.totalBundles(data.summary.totalBundles);
            self.item.totalWeight(utils.roundWeight(data.summary.totalWeight));
            self.item.totalTempInvoicesHappendAmount(utils.roundAmount(data.summary.totalHappendAmount));
            self.needShowHappedAmount(data.item.isFinal == 'true' && data.item.isBalance == 'true');

            self.customerId(data.item.customerId);
            self.corporationId(data.item.corporationId);
            self.isReceive(data.item.isReceive);
            self.paymentFormType(data.item.paymentFormType);
            if (data.item.correspondentBank) // 避免来回切换时，数据变为null
                self.item.correspondentBank(data.item.correspondentBank);
            if (data.item.beneficiaryBankAccountId)
                self.item.beneficiaryBankAccountId(data.item.beneficiaryBankAccountId);

            self.contractCurrencyId(data.contractCurrencyId);
            self.item.currencyId(data.item.currencyId);
            self.item.unitId(data.item.unitId);

            if (options.isCreate) { //默认捆数和默认贴现信息
                self.item.totalBundles(data.summary.totalBundles);
                self.item.totalGrossWeight(utils.roundWeight(data.summary.totalGrossWeight));
                if (models.isNotSightBillType(data.item.paymentFormType)) {
                    self.item.isAmountIncludeDiscountCost(true);
                }
            }
            //设置业务权限信息
            self.business.tradeType(options.isCreate ? window.tradeType : data.item.tradeType);
            self.business.commodityId(data.item.commodityId);
            self.business.corporationId(options.isCreate ? window.corporationId : data.item.corporationId);
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item); //toalAmount取总金额-已发生金额的值
            data.totalAmount = utils.roundAmount(utils.parseFloat(self.item.totalAmount()) - utils.parseFloat(self.item.totalTempInvoicesHappendAmount()));
            return data;
        },
        onSetUserInput: function () {
            if (!self.isUserInput()) {
                self.isUserInput(true);
            } else {
                self.isUserInput(false);
            }
        },
        onRefreshBanks: function () {
            base._get('Company/GetCompanyBanks', { id: self.currentCustomer().id }, function (result) {
                self.banksFromServer(result.data || []);
                //self.banksFromServer.notifySubscribers();
            });
        },
        needShowWarning: function () {
            var showWarning = false;
            if (self.isUserInput()) {
                if (self.item.isAmountIncludeDiscountCost()) { //包含贴现时，系统计算的金额与实际提交的金额的差
                    var amount = utils.parseFloat(self.totalAmount()) / (1 - self.item.discountRatio()); //票面金额=货款/(1-r%)
                    if (utils.roundAmount(utils.parseFloat(self.item.totalAmount())) != utils.roundAmount(amount)) {
                        showWarning = true;
                    }
                } else {
                    if (utils.roundAmount(utils.parseFloat(self.item.totalAmount())) != utils.roundAmount(self.totalAmount())) {
                        showWarning = true;
                    }
                }
            }
            return showWarning;
        },
    };
    $.extend(this, _methods);

    PubSub.subscribe(_OnInitializedDetailSetting, function (msg, data) {
        self.initializeFromDetail(data);
    });

    PubSub.subscribe(_OnLoadDiscountDataFromContract, function (msg, data) {
        if (data) {
            self.item.discountDays(data.discountDays);
            self.item.discountRate(data.discountRate);
        }
    });
};

/**
* wizard第四个tab 填写发票的跨币种信息（仅跨币种时，才显示）
* 输入 发票 发票款项信息
* 输出 发票 + 跨币种信息 + 跨币种金额
*/
function ExchangeRateSettingsViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.visible = ko.observable(true);

    this.item = ko.mapping.fromJS(options.invoiceObject);
    this.hasDiscount = ko.observable(false);

    this.currencyPair = ko.computed(function () {
        return models.findById(models.AllCurrencyPairs, self.item.exchangeRate.wfCurrencyPairId());
    });
    this.currency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.item.invoiceCurrencyId());
    });
    this.actualCurrency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.item.objectCurrencyId());
    });

    this.availableCurrencyPairs = ko.computed(function () {
        if (self.item.invoiceCurrencyId() && self.item.objectCurrencyId())
            return $.grep(models.AllCurrencyPairs, function (r) {
                return (r.baseCurrencyId == self.item.invoiceCurrencyId() && r.counterCurrencyId == self.item.objectCurrencyId()) ||
                      (r.counterCurrencyId == self.item.invoiceCurrencyId() && r.baseCurrencyId == self.item.objectCurrencyId())
            });
        else
            return [];
    });

    this.item.exchangeRate.wfCurrencyPairId.subscribe(function (newVal) {
        self.item.exchangeRate.baseUnitAmount((self.currencyPair() || {}).defaultBaseUnitAmountForUserInput);
        self.item.exchangeRate.counterAmount(null);
    });

    function computedAmount() {
        if (self.item.exchangeRate.baseUnitAmount() && self.item.exchangeRate.counterAmount() && self.currencyPair()) {
            var rate = null;
            if (self.currencyPair().baseCurrencyId == self.item.objectCurrencyId()) {
                rate = utils.parseFloat(self.item.exchangeRate.baseUnitAmount()) / utils.parseFloat(self.item.exchangeRate.counterAmount());
            } else {
                rate = utils.parseFloat(self.item.exchangeRate.counterAmount()) / utils.parseFloat(self.item.exchangeRate.baseUnitAmount());
            }
            self.item.objectCurrencyPresentValue(utils.roundAmount(self.item.invoiceCurrencyPresentValue() * rate));
            self.item.objectCurrencyFutureValue(utils.roundAmount(self.item.invoiceCurrencyFutureValue() * rate));
        }
    };

    this.item.exchangeRate.baseUnitAmount.subscribe(computedAmount);
    this.item.exchangeRate.counterAmount.subscribe(computedAmount);
    this.item.invoiceCurrencyPresentValue.subscribe(computedAmount);
    this.item.invoiceCurrencyFutureValue.subscribe(computedAmount);

    var _methods = {
        isValid: function () {
            return $('#ExchangeRateForm').valid();
        },
        notifySubscribers: function () {

        },
        initializeFromAdvanced: function (data) {
            self.item.objectCurrencyId(data.contractCurrencyId);
            self.item.invoiceCurrencyId(data.invoiceCurrencyId);
            self.hasDiscount(data.amountItem.isAmountIncludeDiscountCost);
            if (data.amountItem.isAmountIncludeDiscountCost) {
                self.item.invoiceCurrencyPresentValue(data.totalValue);
                self.item.invoiceCurrencyFutureValue(data.amountItem.totalAmount);
            } else {
                self.item.invoiceCurrencyPresentValue(data.amountItem.totalAmount);
                self.item.invoiceCurrencyFutureValue(data.amountItem.totalAmount);
            }
            //  computedAmount();
        },
        onChangePairs: function (data, e) {
            //self.item.exchangeRate.baseUnitAmount((self.currencyPair() || {}).defaultBaseUnitAmountForUserInput);
            //self.item.exchangeRate.counterAmount(null);
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            if (!self.hasDiscount())
                data.objectCurrencyPresentValue = data.objectCurrencyFutureValue;

            return data;
        },
        initialize: function (data) {
            if (data.wfInvoiceObjects.length > 0) {
                var exchangeData = $.grep(data.wfInvoiceObjects, function (r) {
                    return r.objectType == models.Enums.InvoiceDetailObjectType.Contract;
                });
                if (exchangeData.length > 0) {
                    exchangeData[0].invoiceCurrencyId = data.currencyId;
                    ko.mapping.fromJS(exchangeData[0], self.item);
                    self.item.exchangeRate.baseUnitAmount(exchangeData[0].exchangeRate.baseUnitAmount);
                    self.item.exchangeRate.counterAmount(exchangeData[0].exchangeRate.counterAmount);
                    self.item.objectCurrencyPresentValue(exchangeData[0].objectCurrencyPresentValue);
                    self.item.objectCurrencyFutureValue(exchangeData[0].objectCurrencyFutureValue);
                }
            }
        },
    };
    $.extend(this, _methods);

    PubSub.subscribe(_OnInitializedAdvancedSetting, function (msg, data) {
        self.initializeFromAdvanced(data);
    });
    //根据选择的临时发票的汇率信息初始化汇率
    PubSub.subscribe(_OnSelectTempInvoiceDone, function (msg, data) {
        self.item.objectCurrencyId(data.contractCurrencyId);
        self.item.invoiceCurrencyId(data.invoiceCurrencyId);
        if (data.exchangeRate) {
            data.exchangeRate.wfExchangeRateId = 0;
            self.item.exchangeRate.wfCurrencyPairId(data.exchangeRate.wfCurrencyPairId);
            self.item.exchangeRate.counterAmount(data.exchangeRate.counterAmount);
            self.item.exchangeRate.baseUnitAmount(data.exchangeRate.baseUnitAmount);
        }
    });
}

/**
* 选择合同和选择发票的基类
* 输入query,url信息
* 返回对应的选择项
*/
ns._BaseSelectViewModel = _class(function () {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.modelName = "";
    this.query = {};
    this.searchUrl = null;
    this.loadDetailsUrl = null;
    this.list = ko.observableArray([]);
    this.selectedItems = ko.observableArray([]);
    this.identifyProperty = "";
    this.isSingleSelect = ko.observable(false);

    this.queryDisable = ko.computed(function () {
        return self.selectedItems().length > 0;
    });

    var _methods = {
        onPreSelect: function () {
            throw 'not implemented';
        },
        onSelect: function (item) {
            if (!self.isSingleSelect()) {
                var selected = $.grep(self.list(), function (r) {
                    return r.isSelected();
                });
                self.selectedItems(selected);
            } else {
                var list = [];
                list.push(item);
                self.selectedItems(list);
                self.notifySubscribers();
            }
            return true;
        },
        onSearch: function () {
            var selected = ko.mapping.toJS(self.selectedItems);
            base._get(self.searchUrl, ko.mapping.toJS(self.query), function (result) {
                if (!self.isSingleSelect()) { //非多选的情况，不用做已选择的处理
                    $.each(result.data.list, function (i, detail) {
                        var has = $.grep(selected, function (r) {
                            return r[self.identifyProperty] == detail[self.identifyProperty];
                        });
                        if (has.length > 0)
                            detail.isSelected = ko.observable(true);
                        else
                            detail.isSelected = ko.observable(false);
                    });
                }
                self.list(result.data.list);
            });
        },
        onCancel: function () {
            return true;
        },
        initialize: function (query, searchUrl, identifyProperty, isSingleSelect, modelName) {
            self.query = query;
            self.searchUrl = searchUrl;
            self.identifyProperty = identifyProperty;
            self.isSingleSelect(isSingleSelect);
            self.modelName = modelName;
        },
        notifySubscribers: function () {
            PubSub.publish(_OnAfterSelectData, {
                items: self.selectedItems(),
                type: self.modelName,
            });
        },
    };
    $.extend(this, _methods);
});

/**
* 最终发票-关联临时发票
*/
ns.SelectInvoiceViewModel = _class(function (models, options) {

});
ns.SelectInvoiceViewModel.inherit(ns._BaseSelectViewModel);

/**
* 非结算发票-管理合同信息
*/
ns.SelectContractViewModel = _class(function (models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.query = {
        customerId: ko.observable(),
        commodityId: ko.observable(),
        accountEntityId: ko.observable(),
        contractCodeContains: ko.observable(),
        isBuy: ko.observable(options.isReceive),
    };
    this.accountingEntities = ko.computed(function () {
        var commodity = $.grep(models.AllCommodities, function (r) {
            return self.query.commodityId() === r.id;
        });
        if (commodity.length > 0)
            return commodity[0].accountingEntities.slice();
        else
            return [];
    });
    this.summary = ko.computed(function () {
        if (self.selectedItems().length > 0) {
            var contract = self.selectedItems()[0];
            return {
                customerId: contract.customerId,
                contractCode: contract.contractCode,
                commodityId: contract.commodityId,
                currencyId: contract.currencyId,
                signDate: contract.signDate,
                departmentId: contract.departmentId,
                accountingEntityId: contract.accountingEntityId,
            };
        } else
            return null;
    });
    var _methods = {
        initialize: function (contractIds) {
            self.upper().initialize(this.query, options.searchContractUrl, "wfContractInfoId", true, _selectModelType.contract);
            if (contractIds) {
                base._get(options.loadContractUrl + '?' + $.param({ contractIds: contractIds }, true), null, function (result) {
                    var list = result.data.list; //目前是单一选择，如果需要多选支持需要修改这部分代码
                    self.selectedItems(list);
                });
            }
        }
    };
    $.extend(this, _methods);
});
ns.SelectContractViewModel.inherit(ns._BaseSelectViewModel);

/**
* 关联合同详情的发票明细
*/
function ContractInvoiceDetailsViewModel(models, options) {
    var self = this;
    this.details = ko.observableArray([]);
    this.commodityId = ko.observable();
    this.currencyId = ko.observable();
    this.detailItem = ko.mapping.fromJS(options.detailItem);
    this.editingItem = ko.mapping.fromJS(options.detailItem);
    this.oldEditItem = null;

    this.invalids = {
        detail: ko.observable(0)
    };
    this.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    this.setCustomShowErrors = {
        detail: function () { self.customShowErrors(self.invalids.detail); }
    };
    this.detailSummary = {
        totalWeight: ko.observable(0),
        totalGrossWeight: ko.observable(0),
        totalAmount: ko.observable(0),
        count: ko.observable(0),
        totalBundles: ko.observable(0),
    };

    this.brands = ko.computed(function () {
        var commodity = models.findById(models.AllCommodities, self.commodityId());
        if (commodity != null)
            return commodity.brands;
        return [];
    });
    this.specifications = ko.computed(function () {
        var commodity = models.findById(models.AllCommodities, self.commodityId());
        if (commodity != null)
            return commodity.specifications;
        return [];
    });
    this.autoCompute = ko.computed(function () {
        if (!isNaN(self.detailItem.price()) && !isNaN(self.detailItem.weight()))
            self.detailItem.amount(utils.parseFloat(self.detailItem.price()) * utils.parseFloat(self.detailItem.weight()));

        if (!isNaN(self.editingItem.price()) && !isNaN(self.editingItem.weight()))
            self.editingItem.amount(utils.parseFloat(self.editingItem.price()) * utils.parseFloat(self.editingItem.weight()));
    });

    this.computedSummary = ko.computed(function () {
        if (self.details().length > 0) {
            var totalWeight = 0, totalGrossWeight = 0, totalAmount = 0, count = 0, totalBundles = 0;
            $.each(self.details(), function (i, r) {
                totalWeight += utils.parseFloat(r.weight());
                totalGrossWeight += utils.parseFloat(r.grossWeight());
                totalAmount += utils.parseFloat(r.amount());
                totalBundles += utils.parseFloat(r.bundles());
                count++;
            });
            self.detailSummary.totalAmount(totalAmount);
            self.detailSummary.totalGrossWeight(totalGrossWeight);
            self.detailSummary.totalWeight(totalWeight);
            self.detailSummary.totalBundles(totalBundles);
            self.detailSummary.count(count);
        }
    });

    var _methods = {
        initialize: function (commodityId, currencyId) {
            self.commodityId(commodityId);
            self.currencyId(currencyId);
            self.validateInit();
        },
        toJS: function () { },
        onPreAddDetail: function () {
            ko.mapping.fromJS(options.detailItem, self.detailItem);
        },
        onAddDetail: function (data) {
            var item = ko.mapping.toJS(self.detailItem);
            self.details.push(ko.mapping.fromJS(item));
            $("#AddInvoiceDetailModal").modal('hide');
        },
        onRemoveDetail: function (item) {
            self.details.remove(item);
        },
        onPreEditDetail: function (item) {
            self.oldEditItem = item;
            ko.mapping.fromJS(ko.mapping.toJS(item), self.editingItem);
        },
        onEditDetail: function () {
            ko.mapping.fromJS(ko.mapping.toJS(self.editingItem), self.oldEditItem);
            self.oldEditItem = null;
            $("#EditInvoiceDetailModal").modal('hide');
        },
        validateInit: function () {
            jQuery.validator.addMethod("isGreater", function (value, element) {
                return this.optional(element) || self.isAmountGreater(value, element);
            }, "净重应该小于毛重！");

            $("#addDetailForm").validate({
                rules: {
                    Weight: {
                        isGreater: true
                    }
                },
            });
            $("#editDetailForm").validate({
                rules: {
                    Weight: {
                        isGreater: true
                    }
                },
            });
        },
        isAmountGreater: function (value, element) {
            var $grossWeight = $($(element.form).find('#GrossWeight'));
            if ($grossWeight.val() && utils.parseFloat(value) > utils.parseFloat($grossWeight.val()))
                return false;
            return true;
        },
    };
    $.extend(this, _methods);
};

/**
* 关联临时发票的最终结算发票
*/
function TempInvoiceDetailsViewModel(models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.list = ko.observableArray([]);
    this.selectedIds = ko.observableArray([]);
    this.checkChangeable = ko.observable(true);
    this.checkAll = ko.observable(false);
    this.commodityId = ko.observable();
    //  this.currencyId = ko.observable();
    this.allTempList = ko.observableArray([]);

    this.detailSummary = {
        totalWeight: ko.observable(0),
        totalGrossWeight: ko.observable(0),
        totalAmount: ko.observable(0),
        count: ko.observable(0),
        totalBundles: ko.observable(0),
        totalHappendAmount: ko.observable(0),
        totalFinalAmount: ko.observable(0),
        totalTempAmount: ko.observable(0),
        totalFinalWeight: ko.observable(0),
        totalTempWeight: ko.observable(0),
    };

    this.computedSummary = ko.computed(function () {
        var list = $.grep(self.list(), function (r) {
            return r.isChecked();
        });
        if (list.length > 0) {
            var totalWeight = 0, totalGrossWeight = 0, totalAmount = 0, count = 0, totalBundles = 0, totalHappened = 0, totalFinalAmount = 0, totalFinalWeight = 0;
            $.each(list, function (i, r) {
                totalWeight += utils.parseFloat(r.totalWeight);
                totalGrossWeight += utils.parseFloat(r.totalGrossWeight);
                totalAmount += utils.parseFloat(r.totalAmount);
                totalBundles += utils.parseFloat(r.totalBundles);
                totalHappened += utils.parseFloat(r.totalHappendAmount);
                totalFinalAmount += utils.parseFloat(r.finalTotalAmount);
                totalFinalWeight += utils.parseFloat(r.finalTotalWeight);
                count++;
            });
            self.detailSummary.totalTempAmount(totalAmount);
            self.detailSummary.totalGrossWeight(totalGrossWeight);
            self.detailSummary.totalBundles(totalBundles);
            self.detailSummary.count(count);
            self.detailSummary.totalHappendAmount(totalHappened);
            self.detailSummary.totalFinalAmount(totalFinalAmount);
            self.detailSummary.totalTempWeight(totalWeight);
            self.detailSummary.totalFinalWeight(totalFinalWeight);
            self.detailSummary.totalAmount(totalFinalAmount); //传递到tab3的value
            self.detailSummary.totalWeight(totalFinalWeight);
        }
    });

    var _methods = {
        initialize: function (commodityId, currencyId) {
            self.commodityId(commodityId);
            //   self.currencyId(currencyId);
        },
        initSelectedList: function (selectedIds, checkChangeable) {
            self.selectedIds(selectedIds);
            self.checkChangeable(checkChangeable);
        },
        toJS: function () {
            var items = $.grep(self.list(), function (r) {
                return r.isChecked();
            });
            return items || [];
        },
        loadList: function (contractId, tempCommercialInvoices) {
            base._get(options.loadTempInvoicesUrl, { id: contractId }, function (result) {
                var list = result.data.list;
                if (tempCommercialInvoices && tempCommercialInvoices.length > 0) { //如果是编辑时，将查询结果和已有的tempInvoice合并
                    $.each(tempCommercialInvoices, function (i, r) {
                        var isInlist = $.grep(list, function (item) {
                            return item.wfInvoiceRecordId == r.wfInvoiceRecordId;
                        });
                        if (isInlist.length == 0) {
                            list.push(r);
                        }
                    });
                }
                $.each(list, function (i, detail) {
                    detail.isChildrenShow = ko.observable(false);
                    detail.isChecked = ko.observable(false);
                    //根据已选中的id确定已选中的列表
                    var hasIds = $.grep(self.selectedIds(), function (r) {
                        return r == detail.wfInvoiceRecordId;
                    });
                    if (hasIds.length > 0) {
                        detail.isChecked(true);
                    }
                    var weight = 0;
                    $.each(detail.wfContractInvoices, function (j, invoice) {
                        weight += invoice.finalWeight;
                    });
                    detail.finalTotalWeight = weight;
                });
                self.allTempList(list);
                var selectedList = $.grep(self.allTempList(), function (r) { return r.isChecked(); });
                // self.list(selectedList);
                PubSub.publish(_OnLoadTempInvoiceDone, {
                    selectedList: selectedList,
                });
            });
        },
        onCheckAll: function () {
            $.each(self.list(), function (i, r) {
                r.isChecked(self.checkAll());
            });
            return true;
        },
        toggleDetails: function (item, event) {
            item.isChildrenShow(!item.isChildrenShow());
            $($(event.currentTarget).closest('tr').children('td')[0]).attr("rowspan", item.isChildrenShow() ? 2 : 1);
        },
        onSelectCurrencyId: function (currencyId) { //根据选择的币种id，切换显示对应的临时发票列表
            var list = $.grep(self.allTempList(), function (r) {
                return r.currencyId == currencyId;
            });
            self.list(list);
        },
    };

    $.extend(this, _methods);
};


/**
* 收票-关联收货记录
*/
ns.EntryRecordItem = function (models, options) {

};


/**
* 开票-关联发货记录
*/
ns.OutRecordItem = function (models, options) {

};
