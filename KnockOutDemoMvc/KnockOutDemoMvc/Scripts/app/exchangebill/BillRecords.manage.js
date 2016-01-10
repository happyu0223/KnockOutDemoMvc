/**
* create by amy
* create date 2015-08-20
*/
"use strict";
var ns = utils.namespace('GMK.ExchangBill.BillRecords');

ns.start = function (data) {
    var baseUrl = 'ExchangeBill/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.ManageViewModel(models, data, {
            loadBillUrl: baseUrl + 'GetBill',
            loadLCUrl: baseUrl + 'GetLC',
            saveUrl: baseUrl + 'SaveBill',
            searchLCUrl: baseUrl + 'SearchLCForBill',
        });
        viewModel.initialize(data);
        viewModel.commonModels.registerQueryFormEvent();
        ko.applyBindings(viewModel);
    });
};

ns.ManageViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.commonModels = models;
    self.isCreate = !values.billId;

    var billTypes = models.Enums.ExchangeBillType;
    var billStatus = models.Enums.ExchangeBillPurposeStatus;

    self.item = ko.mapping.fromJS(values.data);
    self.billStatus = models.EnumOptions.ExchangeBillPurposeStatus;

    self.allCustomers = models._AllCustomers.slice().concat(models._AllBanks.slice()).concat(models._AllCorporations.slice());
    self.loadFromLC = ko.observable(false);

    //选择信用证相关信息
    self.lcList = ko.observableArray([]);
    self.lcQuery = {
        issuingBankId: ko.observable(),
        advisingBankId: ko.observable(),
        commodityId: ko.observable(),
        accountingEntityId: ko.observable(),
        code: ko.observable(),
        isPay: ko.observable(),
        isSight: ko.observable(),
    };
    self.selectedLC = ko.mapping.fromJS($.extend(values.lcData, { isLoaded: false }));
    self.lcSummary = ko.computed(function () {
        if (self.selectedLC.isLoaded()) {
            var lc = ko.mapping.toJS(self.selectedLC);
            var sightMsg = lc.isSight ? '即期' : '远期';
            var currency = models.findById(models.AllCurrencies, lc.currencyId);
            var currencyCode = currency ? currency.symbol + currency.code : '';
            var amount = self.isCreate ? utils.formatAmount(lc.availableAmount) : (utils.formatAmount(lc.availableAmount + self.item.amount()));

            var summary = "信用证编号：{0}，类型：{1}信用证，方向：{2}，剩余金额：{3} {4}".format(
                lc.code, sightMsg, lc.isPay ? '用于付款':'用于收款',
                currencyCode, amount);
            return summary;
        } else
            return "";
    });
    self.queryAccountingEntities = ko.computed(function () {
        var commodity = $.grep(models.AllCommodities, function (r) {
            return self.lcQuery.commodityId() === r.id;
        });
        if (commodity.length > 0)
            return commodity[0].accountingEntities.slice();
        else
            return [];
    });
    self.lcBtnDisable = ko.observable(false);

    self.lcBtnShow = ko.computed(function () {
        return models.isForLcBillType(self.item.type());
    });

    //save validate
    self.invalids = {
        bill: ko.observable(0)
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        bill: function () { self.customShowErrors(self.invalids.bill); }
    };

    //收付款默认信息
    //self.item.purposeStatus.subscribe(function (newVal) {
    //    if (newVal === billStatus.ForReceiveAmountRecord) {
    //        if (!self.item.payeeId())
    //            self.item.payeeId(window.corporationId);
    //        if (!self.item.holderId())
    //            self.item.holderId(window.corporationId);            
    //    } else if (newVal === billStatus.ForPayAmountRecord) {
    //        if (!self.item.drawerId())
    //            self.item.drawerId(window.corporationId);
    //        if (!self.item.draweeId())
    //            self.item.draweeId(window.corporationId);
    //    }
    //});

    //即期远期判断
    self.isUsance = ko.computed(function () {
        var type = self.item.type();
        return models.isNotSightBillType(type);
    });
    //现值预设,可编辑
    //self.setDefaultPresentValue = ko.computed(function () {
    //    if (self.isUsance()) {
    //        var rate = self.item.discountRate();
    //        var days = self.item.discountDays();
    //        var amount = self.item.amount();
    //        if (rate && !isNaN(rate) && days && !isNaN(days) && amount && !isNaN(amount)) {
    //            var val = Number(amount) / (1 + (Number(rate) * Number(days) / 365));
    //            self.item.presentValue(utils.formatAmount(val));
    //        }
    //    } else
    //        self.item.presentValue(self.item.amount());
    //});

    var _methods = {
        initialize: function (data) {
            if (!self.isCreate) {
                self.loadBill();
            } else {
                self.item.corporationId(window.corporationId);
                self.item.isTransferable('true');
                self.item.isDrawer('false');
                if (data.lcId)
                    self.loadLC();
            }
           // self.validateInit(); //票据金额的验证在后台做，前台不做check
        },
        loadBill: function () { //编辑时默认加载
            base._get(options.loadBillUrl, { id: values.billId }, function (result) {
                var data = self.fromJS(result.data.item);
                data.isTransferable = (data.isTransferable + '').toLowerCase();
                data.isDrawer = (data.isDrawer + '').toLowerCase();
                ko.mapping.fromJS(data, self.item);
                if (data.wfLetterOfCreditId && data.wfLetterOfCredit)
                    self.onSelectLC(data.wfLetterOfCredit);
            });
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            if (self.selectedLC.isLoaded()) { //填充信用证信息
                data.wfLetterOfCreditId = self.selectedLC.wfLetterOfCreditId();
            }
            if (data.purposeStatus === billStatus.ForReceiveAmountRecord) {
                data.payableHappenDate = null;
                data.payableClearDate = null;
                data.payDiscountRate = null;
                data.payDiscountDays = null;
                data.payPresentValue = null;
                data.payCustomerId = null;
                data.receivableHappenDate = data.happenDate;
                data.receivableClearDate = data.clearDate;
                data.receiveDiscountRate = data.discountRate;
                data.receiveDiscountDays = data.discountDays;
                data.receivePresentValue = data.presentValue;
                data.receiveCustomerId = data.customerId;
            } else
                if (data.purposeStatus === billStatus.ForPayAmountRecord) {
                    data.receivableHappenDate = null;
                    data.receivableClearDate = null;
                    data.receiveDiscountRate = null;
                    data.receiveDiscountDays = null;
                    data.receivePresentValue = null;
                    data.receiveCustomerId = null;
                    data.payableHappenDate = data.happenDate;
                    data.payableClearDate = data.clearDate;
                    data.payDiscountRate = data.discountRate;
                    data.payDiscountDays = data.discountDays;
                    data.payPresentValue = data.presentValue;
                    data.payCustomerId = data.customerId;
                }
            return data;
        },
        fromJS: function (data) {
            if (data.purposeStatus === billStatus.ForReceiveAmountRecord) {
                data.happenDate = data.receivableHappenDate;
                data.clearDate = data.receivableClearDate;
                data.discountRate = data.receiveDiscountRate;
                data.discountDays = data.receiveDiscountDays;
                data.presentValue = data.receivePresentValue;
                data.customerId = data.receiveCustomerId;
            } else
                if (data.purposeStatus === billStatus.ForPayAmountRecord) {
                    data.happenDate = data.payableHappenDate;
                    data.clearDate = data.payableClearDate;
                    data.discountRate = data.payDiscountRate;
                    data.discountDays = data.payDiscountDays;
                    data.presentValue = data.payPresentValue;
                    data.customerId = data.payCustomerId;
                }
            return data;
        },
        onSave: function () {
            var param = self.toJS();
            base._post(options.saveUrl, param, function (result) {
                base._back();
            });
        },
        onPreSearch: function () {
            self.lcList.removeAll();
            if (self.item.type() == billTypes.LetterOfCreditsBankDemandDraft)
                self.lcQuery.isSight(true);
            else if (self.item.type() == billTypes.LetterOfCreditsBankAcceptanceBill)
                self.lcQuery.isSight(false);
            return true;
        },
        onSearchLC: function () {
            var param = ko.mapping.toJS(self.lcQuery);
            base._get(options.searchLCUrl, param, function (result) {
                self.lcList(result.data.list);
            });
        },
        onSelectLC: function (item) {
            ko.mapping.fromJS(item, self.selectedLC);
            self.initBillFromLC(item);
            self.selectedLC.isLoaded(true);
            self.loadFromLC(true);
            self.lcBtnDisable(false);
            return true;
        },
        onRemoveLC: function () {
            ko.mapping.fromJS(values.lcData, self.selectedLC);
            self.loadFromLC(false);
        },
        loadLC: function () { //根据信用证加载票据
            self.loadFromLC(true);
            self.lcBtnDisable(true);
            base._get(options.loadLCUrl, { id: values.lcId }, function (result) {
                ko.mapping.fromJS(result.data.item, self.selectedLC);
                self.selectedLC.isLoaded(true);
                self.initBillFromLC(result.data.item);
            });
        },
        initBillFromLC: function (lc) {
            if (self.isCreate) {
                self.item.purposeStatus(lc.isPay ? billStatus.ForPayAmountRecord : billStatus.ForReceiveAmountRecord);
                self.item.isDrawer(lc.isPay ? 'false' : 'true');
                self.item.isTransferable('false');
                self.item.currencyId(lc.currencyId);
                if (lc.isSight)
                    self.item.type(billTypes.LetterOfCreditsBankDemandDraft);
                else
                    self.item.type(billTypes.LetterOfCreditsBankAcceptanceBill);
                self.item.accountingEntityId(lc.accountingEntityId);
            }
        },
        validateInit: function () {
            jQuery.validator.addMethod("isGreater", function (value, element) {
                return this.optional(element) || self.isAmountGreater(value);
            }, "票据金额不能超过信用证剩余金额");

            $("#billForm").validate({
                rules: {
                    Amount: {
                        isGreater: true
                    }
                },
            });
        },
        isAmountGreater: function (value) {
            if (self.item.type() == billTypes.LetterOfCreditsBankDemandDraft || self.item.type() == billTypes.LetterOfCreditsBankAcceptanceBill) {
                if (utils.parseFloat(value) > utils.parseFloat(self.selectedLC.availableAmount())) {
                    return false;
                }
            }
            return true;
        },
    };

    $.extend(this, _methods);
};
