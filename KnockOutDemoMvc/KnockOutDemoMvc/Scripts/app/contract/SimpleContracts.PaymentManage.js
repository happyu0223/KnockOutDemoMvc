
//支付方式信息-SettleOptionViewModel
var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.SettleOptionViewModel = GMK.Contract.SettleOptionViewModel || {};
GMK.Contract.SettleOptionViewModel = function () {
    var self = this;
    self.CRPayment = {};
    self.LCPayment = {};
    self.DPPayment = {};
    self.item = {};
    self.types = ko.observableArray([]);
    self.paymentTypes = ko.observableArray([]);
    self.settleOptionType = ko.observable();
    self.settleOptionData = ko.observable(); //存储settleOptions 用于编辑时传值

    self.haveValue = ko.observable(false);
    self.discountData = { //根据支付形式保存的贴现信息
        isAmountIncludeDiscountCost: ko.observable(),
        discountCost : ko.observable(),
    };

    function autoComputeInit(models) {
        self.paymentFormDisable = ko.computed(function () {//支付方式选择禁用
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) { //仅信用证禁用
                return true;
            }
            return false;
        });
        self.epTypeBtnDisable = ko.computed(function () {//货款方式按钮禁用
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) { //仅信用证可用
                return false;
            }
            return true;
        });

        self.needDiscount = ko.computed(function () {
            return models.isNotSightBillType(self.item.paymentFormType());           
        });

        self.paymentTypeAutoComputed = ko.computed(function () {
            var newVal = self.item.exchangeProcessType();
            if (newVal == self.types.LetterOfCredit) {
                if (self.LCPayment.isUsance()) {
                    self.item.paymentFormType(self.paymentTypes.LetterOfCreditsBankAcceptanceBill);
                } else
                    self.item.paymentFormType(self.paymentTypes.LetterOfCreditsBankDemandDraft);
            } else
                if (newVal == self.types.DocumentsAgainstPayment) {
                    self.item.paymentFormType(self.paymentTypes.CommercialDraftAtSight);
                } else
                    if (newVal == self.types.DocumentsAgainstAcceptance)
                        self.item.paymentFormType(self.paymentTypes.CommercialAcceptanceBill);
        });
    };
    
    self.init = function (route, paymentData, models, settleOptionType) {
        self.item = ko.mapping.fromJS(route.sodData);
        self.CRPayment = new GMK.Contract.CRPayment(route.sodEpCrData, models);
        self.LCPayment = new GMK.Contract.LCPayment(route.sodEpLcData, models);
        self.DPPayment = new GMK.Contract.DPPayment(route.sodEpDpData, models);
        self.DAPayment = new GMK.Contract.DAPayment(route.sodEpDaData, models);

        self.types = models.Enums.ExchangeProcessType;
        self.paymentTypes = models.Enums.PaymentFormType;

        self.fill(paymentData, null, settleOptionType);
        autoComputeInit(models);
    };


    //根据已有数据填充viewmodel
    self.fill = function (data, settleOptionData, settleOptionType) {
        if (data != null) {
            ko.mapping.fromJS(data, self.item);
            var epData = data.wfSettleOptionDetailExchangeProcess;
            if (data.exchangeProcessType == self.types.ConditionalRelease) {
                ko.mapping.fromJS(epData.wfSodEpConditionalRelease, self.CRPayment);
            } else
                if (data.exchangeProcessType == self.types.LetterOfCredit) {
                    epData.wfSodEpLetterOfCredit.wfSodPfExchangeBill = data.wfSettleOptionDetailPaymentForm.wfSodPfExchangeBill;
                    ko.mapping.fromJS(epData.wfSodEpLetterOfCredit, self.LCPayment);
                } else
                    if (data.exchangeProcessType == self.types.DocumentsAgainstPayment) {
                        ko.mapping.fromJS(epData.wfSodEpDocumentsAgainstPayment, self.DPPayment);
                    } else
                        if (data.exchangeProcessType == self.types.DocumentsAgainstAcceptance) {
                            ko.mapping.fromJS(epData.wfSodEpDocumentsAgainstAcceptance, self.DAPayment);
                        }

            self.haveValue(true);
        }

        if (settleOptionData) {
            self.settleOptionData(settleOptionData);
        }

        self.settleOptionType(settleOptionType);
    }

    self.toJson = function () {
        var data = ko.mapping.toJS(self.item);
        data.wfSettleOptionDetailExchangeProcess.exchangeProcessType = data.exchangeProcessType;
        data.wfSettleOptionDetailPaymentForm.paymentFormType = data.paymentFormType;

        if (self.item.exchangeProcessType() == self.types.ConditionalRelease) {
            data.wfSettleOptionDetailExchangeProcess.wfSodEpConditionalRelease = ko.mapping.toJS(self.CRPayment);
            data.wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit = null;
            data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstPayment = null;
            data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstAcceptance = null;
        } else
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) {
                var lc = ko.mapping.toJS(self.LCPayment);
                data.wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit = lc;
                //信用证相关支付形式信息存储
                data.wfSettleOptionDetailPaymentForm.wfSodPfExchangeBill = lc.wfSodPfExchangeBill;
                data.wfSettleOptionDetailPaymentForm.wfSodPfExchangeBill.type = data.paymentFormType;
                data.wfSettleOptionDetailExchangeProcess.wfSodEpConditionalRelease = null;
                data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstPayment = null;
                data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstAcceptance = null;
            } else
                if (self.item.exchangeProcessType() == self.types.DocumentsAgainstPayment) {
                    data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstPayment = ko.mapping.toJS(self.DPPayment);
                    data.wfSettleOptionDetailExchangeProcess.wfSodEpConditionalRelease = null;
                    data.wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit = null;
                    data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstAcceptance = null;
                } else
                    if (self.item.exchangeProcessType() == self.types.DocumentsAgainstAcceptance) {
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstAcceptance = ko.mapping.toJS(self.DAPayment);
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpConditionalRelease = null;
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit = null;
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstPayment = null;
                    } else {
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpConditionalRelease = null;
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit = null;
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstPayment = null;
                        data.wfSettleOptionDetailExchangeProcess.wfSodEpDocumentsAgainstAcceptance = null;
                    }

        var settleOptions = ko.mapping.toJS(self.settleOptionData);
        var settleData = {
            optionType: self.settleOptionType(),
            exchangeProcessType: data.exchangeProcessType,
            paymentFormType: data.paymentFormType,
            note: data.note,
            currencyId: settleOptions ? settleOptions.currencyId : null,
            wfSettleOptionDetails: [data || {}],
            wfSettleOptionId: settleOptions ? settleOptions.wfSettleOptionId : 0,
        };

        return settleData;
    }

    self.onSave = function (data, event, callback) {
        self.haveValue(true);
        $(event.currentTarget).closest('.modal').modal('hide');
        if (callback)
            callback();
    }

    self.summary = ko.computed(function () {
        var summary = "";
        if (self.haveValue()) {
       
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) {
                summary = self.LCPayment.summary ? (self.LCPayment.summary() || "") : "";
            }
                //else
            //if (self.item.exchangeProcessType() == self.types.ConditionalRelease) {
            //    summary = self.CRPayment.summary ? (self.CRPayment.summary() || "") : "";
            //}  else
            //        if (self.item.exchangeProcessType() == self.types.DocumentsAgainstPayment) {
            //            summary = self.DPPayment.summary ? (self.DPPayment.summary() || "") : "";
            //        } else
            //            if (self.item.exchangeProcessType() == self.types.DocumentsAgainstAcceptance) {
            //                summary = self.DAPayment.summary ? (self.DAPayment.summary() || "") : "";
            //            }
            //            else {
            //                summary = "备注信息：" + (self.item.note ? (self.item.note() || "") : "");
            //            }
        }
        return summary;
    });

    self.oldData = {};
    self.onClick = function () {
        if (self.item.exchangeProcessType() == self.types.ConditionalRelease) {
            self.oldData = ko.mapping.toJS(self.CRPayment);
            $('#CRPaymentModal').modal('show');
        } else
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) {
                self.oldData = ko.mapping.toJS(self.LCPayment);
                $('#LCPaymentPriceModal').modal('show');
            } else
                if (self.item.exchangeProcessType() == self.types.DocumentsAgainstPayment) {
                    self.oldData = ko.mapping.toJS(self.DPPayment);
                    $('#DPPaymentModal').modal('show');
                } else if (self.item.exchangeProcessType() == self.types.DocumentsAgainstAcceptance) {
                    self.oldData = ko.mapping.toJS(self.DAPayment);
                    $('#DAPaymentModal').modal('show');
                } else {
                    self.oldData = ko.mapping.toJS(self.item);
                    $('#CommonPaymentModal').modal('show');
                }
        return true;
    }

    self.onCancel = function () {
        if (self.item.exchangeProcessType() == self.types.ConditionalRelease) {
            ko.mapping.fromJS(self.oldData, self.CRPayment);
        } else
            if (self.item.exchangeProcessType() == self.types.LetterOfCredit) {
                ko.mapping.fromJS(self.oldData, self.LCPayment);
            } else
                if (self.item.exchangeProcessType() == self.types.DocumentsAgainstPayment) {
                    ko.mapping.fromJS(self.oldData, self.DPPayment);
                } if (self.item.exchangeProcessType() == self.types.DocumentsAgainstAcceptance) {
                    ko.mapping.fromJS(self.oldData, self.DAPayment);
                } else
                    ko.mapping.fromJS(self.oldData, self.item);
        return true;
    }

    self.getDiscountData = function () {
        return ko.mapping.toJS(self.discountData);
    };

    self.setDiscountData = function (data) {
        self.discountData.isAmountIncludeDiscountCost(data.isAmountIncludeDiscountCost);
        self.discountData.discountCost(data.discountCost);
    };
}

//有条件放货-ConditionalReleaseViewModel
GMK.Contract.CRPayment = function (crData, models) {
    var self = $.extend(this, ko.mapping.fromJS(crData));

    self.summary = function () {
        var wearhouse = models._findCompany(self.companyId());
        return "有条件放货信息：第三方：{0}，条件：{1}".format((wearhouse ? wearhouse.shortName : "(暂无)"), models.Enums.ReleaseCondition._Notes[self.releaseCondition()]);
    };
};

//信用证-CreditLetterViewModel
GMK.Contract.LCPayment = function (lcData, models) {
    var self = $.extend(this, ko.mapping.fromJS(lcData));
    self.summary = function () {
        var summary = "信用证信息：";
        var licensingBank = models._findCompany(self.issuingBankId());
        var notification = models._findCompany(self.advisingBankId());
        summary += "开证行：" + (licensingBank ? licensingBank.shortName : "(暂无)");
        summary += "；通知行：" + (notification ? notification.shortName : "(暂无)");
        summary += "；期限类型：" + models.Enums.TermType._Notes[self.termType()];

        if (self.termType() == models.Enums.TermType.Usance) {
            if (self.wfSodPfExchangeBill) {
                summary += "；固定利率：" + (self.wfSodPfExchangeBill.discountRate() || "");
                if (self.wfSodPfExchangeBill.floatInterestType()) {
                    summary += "；浮动利率：" + models.Enums.FloatInterestType._Notes[self.wfSodPfExchangeBill.floatInterestType()];
                }
            }
        }

        return summary;
    };

    self.isUsance = ko.computed(function () {
        if (self.termType && self.termType() == models.Enums.TermType.Sight)
            return false;
        else
            return true;
    });
}

//付款交单-DocumentAgainstPaymentViewModel
GMK.Contract.DPPayment = function (dpData, models) {
    var self = $.extend(this, ko.mapping.fromJS(dpData));

    self.summary = function () {
        var summary = "付款交单信息：";
        var buyer = models._findCompany(self.buyerBankId());
        var saler = models._findCompany(self.salerBankId());
        summary += "买方银行：" + (buyer ? buyer.shortName : "(暂无)");
        summary += "；卖方银行：" + (saler ? saler.shortName : "(暂无)");
        return summary;
    };
}

//承兑交单
GMK.Contract.DAPayment = function (daData, models) {
    var self = $.extend(this, ko.mapping.fromJS(daData));

    self.summary = function () {
        var summary = "承兑交单信息：";
        var buyer = models._findCompany(self.buyerBankId());
        var saler = models._findCompany(self.salerBankId());
        summary += "买方银行：" + (buyer ? buyer.shortName : "(暂无)");
        summary += "；卖方银行：" + (saler ? saler.shortName : "(暂无)");
        return summary;
    };
}
