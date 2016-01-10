/**
* create by amy
* create date 2015-08-24
*/
"use strict";
var ns = utils.namespace('GMK.Settlement.PaymentRequests');

ns.start = function (data) {
    var baseUrl = 'Settlement/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.FillRecordsViewModel(models, data);
        viewModel.initialize(data);
        ko.applyBindings(viewModel);
    });
};

ns.FillRecordsViewModel = function (models, options) {
    var self = this, base = GMK.Features.FeatureBase;
    this.commonModels = models;
    this.payTypes = models.Enums.PaymentFormType;
    this.payRequestType = ko.observable();
    this.payPurposeType = ko.observable();
    this.currencyId = ko.observable();
    this.actualCurrencyId = ko.observable();
    this.amount = ko.observable();
    this.payRequestData = ko.observable(); //原始付款申请单
    this.details = ko.observableArray([]); //付款详情
    this.needRate = ko.observable(true);
    this.billPresentValue = ko.observable();
    
    this.isUserInput = ko.observable(false); //控制用户输入

    this.item = {
        payRequestId: ko.observable(options.requestId),
        payTime: ko.observable(),
        note: ko.observable(),
        exchangeBillId: ko.observable(),
        settleAmount: ko.observable(),
        settleCurrencyPresentValue: ko.observable(),
        settleCurrencyFutureValue: ko.observable(),
        actualAmount: ko.observable(),
        actualCurrencyPresentValue: ko.observable(),
        actualCurrencyFutureValue: ko.observable(),
        billDiscountRate: ko.observable(),
        billDiscountDays: ko.observable(),
    };
    this.selectBill = new ns.SelectBillViewModel(models, options);
    this.currencyRate = ko.observable();

    this.billPresentValue.subscribe(function (newVal) {
        if (!isNaN(newVal) && self.details().length == 1) { //只有一条明细信息时，直接赋值到现值框
           // if (!self.details()[0].actualCurrencyPresentValue())
                self.details()[0].actualCurrencyPresentValue(newVal);
        }
    });
    this.selectBill.selected.subscribe(function (newVal) {
        if (newVal && self.details().length == 1) {
          //  if (!self.details()[0].actualCurrencyFutureValue())
                self.details()[0].actualCurrencyFutureValue(self.selectBill.selected().amount);
        }
    });

    this.needExchangeBill = ko.computed(function () {
        if (self.payRequestType()) {
            return !(self.payRequestType() == self.payTypes.TelegraphicTransfer || self.payRequestType() == self.payTypes.CashiersCheque
                    || self.payRequestType() == self.payTypes.Cheque);
        }
        return false;
    });

    this.isUsance = ko.computed(function () {
        var type = self.payRequestType();
        return models.isNotSightBillType(type);
    });

    this.autoComputed = ko.computed(function () {
        if (self.details().length > 0) {
            var actualPresentAmount = 0, actualFutureAmount = 0, settlePresentAmount = 0, settleFutureAmount = 0, settleAmount = 0, actualAmount = 0;
            $.each(self.details(), function (i, item) {
                actualPresentAmount += utils.parseFloat(item.actualCurrencyPresentValue());
                actualFutureAmount += utils.parseFloat(item.actualCurrencyFutureValue());
                settlePresentAmount += utils.parseFloat(item.settleCurrencyPresentValue());
                settleFutureAmount += utils.parseFloat(item.settleCurrencyFutureValue());
                settleAmount += utils.parseFloat(item.amount());
                actualAmount += utils.parseFloat(item.actualCurrencyAmount());
            });
            self.item.actualCurrencyPresentValue(utils.roundAmount(actualPresentAmount));
            self.item.actualCurrencyFutureValue(utils.roundAmount(actualFutureAmount));
            self.item.settleCurrencyPresentValue(utils.roundAmount(settlePresentAmount));
            self.item.settleCurrencyFutureValue(utils.roundAmount(settleFutureAmount));
            self.item.settleAmount(settleAmount);
            self.item.actualAmount(actualAmount);
        }
    });

    this.setPrentValue = ko.computed(function () {
        if (self.selectBill.selected() && !self.billPresentValue()) {
            self.billPresentValue(self.selectBill.selected().amount);
        }
    });

    this.setRate = function () {
        var exchangeRate = self.payRequestData().exchangeRate, currencyId = self.currencyId(), actualCurrencyId = self.actualCurrencyId();
        var rate = 0;
        if (currencyId != actualCurrencyId && exchangeRate) {
            var pair = models.findById(models.AllCurrencyPairs, exchangeRate.wfCurrencyPairId);
            if (pair) {
                if (currencyId == pair.baseCurrencyId) {
                    rate = utils.parseFloat(exchangeRate.baseUnitAmount) / utils.parseFloat(exchangeRate.counterAmount);
                } else
                    rate = utils.parseFloat(exchangeRate.counterAmount) / utils.parseFloat(exchangeRate.baseUnitAmount);
                return rate;
            }
        }
        return null;
    };

    this.initialize = function () {
        base._get(options.getPaymentRequestUrl, { id: options.requestId }, function (result) {
            self.fillRecord(result.data);
        });
    };

    this.fillRecord = function (data) {
        self.item.payTime(data.payDate);
        self.item.note(data.payNote);
        self.item.settleAmount(data.amount);
        self.item.actualAmount(data.actualCurrencyAmount);
        self.payRequestType(data.payType);
        self.payPurposeType(data.payPurposeType);
        self.currencyId(data.currencyId);
        self.actualCurrencyId(data.actualCurrencyId);
        self.selectBill.initFromData(data);
        self.payRequestData(data);
        self.currencyRate(self.setRate());
        self.needRate(data.currencyId != data.actualCurrencyId);

        var list = [];
        $.each(data.wfPayRequestDetails, function (i, item) {
            var objectTypes = models.Enums.AmountDetailObjectType;
            switch (data.detailObjectType) {
                case objectTypes.Contract:
                    item.code = item.wfContractInfo.contractCode;
                    item.customer = models.findCustomer(item.wfContractInfo.customerId);
                    item.isNomal = true;
                    item.isAmountIncludeDiscountCost = item.isAmountIncludeDiscountCost;
                    break;
                case objectTypes.CommercialInvoice:
                    item.code = item.wfCommercialInvoice.wfInvoiceRecord.invoiceCode;
                    item.customer = models.findCustomer(item.wfCommercialInvoice.wfInvoiceRecord.customerId);
                    item.isNomal = true;
                    item.isAmountIncludeDiscountCost = item.wfCommercialInvoice.wfInvoiceRecord.isAmountIncludeDiscountCost;
                    break;
                case objectTypes.LogisticsFee:
                case objectTypes.WarehouseFee:
                    item.code = item.wfFeeRecord.feeName;
                    item.customer = models.findCustomer(item.wfFeeRecord.customerId);
                    item.isNomal = true;
                    item.isAmountIncludeDiscountCost = false;
                    break;
            }
            if (!self.isUsance()) { //非远期才进行赋值处理
                if (!item.actualCurrencyPresentValue)
                    item.actualCurrencyPresentValue = item.actualCurrencyAmount;
                if (!item.actualCurrencyFutureValue)
                    item.actualCurrencyFutureValue = item.actualCurrencyAmount;
                if (!item.settleCurrencyFutureValue)
                    item.settleCurrencyFutureValue = item.amount;
                if (!item.settleCurrencyPresentValue)
                    item.settleCurrencyPresentValue = item.amount;
            } 

            var itemJs = ko.mapping.fromJS(item);

            itemJs.actualCurrencyPresentValue.subscribe(function (newVal) {
                if (!self.isUserInput()) {
                    if (self.currencyRate()) {
                        itemJs.settleCurrencyPresentValue(utils.roundAmount(utils.parseFloat(newVal) * self.currencyRate()));
                    } else {
                        itemJs.settleCurrencyPresentValue(utils.roundAmount(utils.parseFloat(newVal)));
                    }
                }
            });

            itemJs.actualCurrencyFutureValue.subscribe(function (newVal) {
                if (!self.isUserInput()) {
                    if (self.currencyRate()) {
                        itemJs.settleCurrencyFutureValue(utils.roundAmount(utils.parseFloat(newVal) * self.currencyRate()));
                    } else {
                        itemJs.settleCurrencyFutureValue(utils.parseFloat(newVal));
                    }
                }
            });
            list.push(itemJs);
        })
        self.details(list);

        if (data.wfAmountRecords && data.wfAmountRecords.length > 0) { //已有设置过信息
            var amountRecord = data.wfAmountRecords[0];
            if (amountRecord) {
                self.item.billDiscountDays(amountRecord.billDiscountDays);
                self.item.billDiscountRate(amountRecord.billDiscountRate);
                self.billPresentValue(amountRecord.actualCurrencyPresentValue);
            }
        } else {
            if (data.wfPayRequestDetails && data.wfPayRequestDetails.length > 0 && data.wfPayRequestDetails[0].wfCommercialInvoice) {
                var invoice = data.wfPayRequestDetails[0].wfCommercialInvoice;
                self.item.billDiscountDays(invoice.wfInvoiceRecord.discountDays);
                self.item.billDiscountRate(invoice.wfInvoiceRecord.discountRate);
                self.billPresentValue(utils.roundAmount(invoice.wfInvoiceRecord.totalAmount - invoice.wfInvoiceRecord.discountCost));
            }
        }
    };

    this.toJS = function () {
        var data = ko.mapping.toJS(self.item);
        if (self.selectBill.selected()) {
            data.exchangeBillId = self.selectBill.selected().wfExchangeBillId;
        }
        var payRequest = ko.mapping.toJS(self.payRequestData);
        payRequest.wfPayRequestDetails = ko.mapping.toJS(self.details); //根据贴现填写终值

        if (!self.isUsance()) { //非远期，现值=终值
            $.each(payRequest.wfPayRequestDetails, function (i, r) {
                r.actualCurrencyPresentValue = r.actualCurrencyAmount;
                r.actualCurrencyFutureValue = r.actualCurrencyAmount;
                r.settleCurrencyFutureValue = r.amount;
                r.settleCurrencyPresentValue = r.amount;
            });

            data.actualCurrencyFutureValue = data.actualAmount;
            data.actualCurrencyPresentValue = data.actualAmount;
            data.settleCurrencyFutureValue = data.settleAmount;
            data.settleCurrencyPresentValue = data.settleAmount;
        }
        data.wfPayRequest = payRequest;
        return data;
    };

    this.onSubmit = function () {
        if (self.validate()) {            
            base._postThenBack(options.saveUrl, self.toJS());
        }
    };

    this.onSubmitAndFinish = function () {
        if (self.validate()) {
            base._post(options.saveUrl, self.toJS(), function (result) {
                if (result) {
                    base._postThenBack(options.finishUrl, {
                        id: self.item.payRequestId,
                        status: models.Enums.PayRequestStatus.Finished
                    });
                }
            });
        }
    };

    this.validate = function () {
        if (self.needExchangeBill()) {
            if (!self.selectBill.selected()) {
                alert("请选择对应的汇票记录");
                return false;
            }

            if (self.isUsance() && utils.parseFloat(self.billPresentValue()) != utils.parseFloat(self.item.actualCurrencyPresentValue())) {
                alert("票据现值与付款现值不一致，请确认输入正确现值信息！");
                return false;
            }

            if (utils.parseFloat(self.selectBill.selected().amount) != utils.parseFloat(self.item.actualCurrencyFutureValue())) {
                alert("票据金额与对应的付款金额不一致，请确认选择正确的票据信息！");
                return false;
            }
        }
        return true;
    };

    this.onSetUserInput = function () {
        self.isUserInput(!self.isUserInput());
        if (!self.isUserInput()) {
            $.each(self.details(), function (i,item) {
                if (self.currencyRate()) {
                    item.settleCurrencyPresentValue(utils.roundAmount(utils.parseFloat(item.actualCurrencyPresentValue()) * self.currencyRate()));
                    item.settleCurrencyFutureValue(utils.roundAmount(utils.parseFloat(item.actualCurrencyFutureValue()) * self.currencyRate()));
                } else {
                    item.settleCurrencyPresentValue(utils.roundAmount(utils.parseFloat(item.actualCurrencyPresentValue())));
                    item.settleCurrencyFutureValue(utils.parseFloat(item.actualCurrencyFutureValue()));
                }
            });
        }
    };
};

ns.SelectBillViewModel = function (models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.query = {
        code: ko.observable(),
        type: ko.observable(),
        drawerId: ko.observable(),
        holderId: ko.observable(),
        accountingEntityId: ko.observable(),
        currencyId: ko.observable(),
        status: ko.observable(models.Enums.ExchangeBillUseStatus.Available),
        billAmountUseStatus: ko.observable(models.Enums.ExchangeBillAmountUseStatus.AvailableForPayAmountRecord),
        letterOfCreditCode: ko.observable(),
    };
    this.list = ko.observableArray([]);
    this.selected = ko.observable();

    this.summary = ko.computed(function () {
        if (self.selected()) {
            var data = self.selected();
            var currency = models.findById(models.AllCurrencies, data.currencyId);
            var currencyCode = currency ? currency.symbol + currency.code : '';
            var summary = "<strong>票据基本信息</strong><br />票据编号：{0}，开票人：{1}，核算主体：{2}，金额：{3} {4}".format(
                data.code, models.findCustomer(data.drawerId),
                models.findAccountingEntity(data.accountingEntityId),
                currencyCode, utils.formatAmount(data.amount));
            return summary;
        }
        else
            return "";
    });

    var _methods = {
        onSearch: function () {
            var param = ko.mapping.toJS(self.query);
            base._get(options.searchBillUrl, param, function (result) {
                var list = result.data;
                self.list(list);
            });
        },
        onSelect: function (item) {
            self.selected(item);
            return true;
        },
        onCancel: function () { return true; },
        onRemove: function (item) {
            self.selected(null);
        },
        initFromData: function (data) {
            self.query.accountingEntityId(data.accountingEntityId);
            self.query.currencyId(data.actualCurrencyId);
            self.query.type(data.payType);
            if (data.wfAmountRecords[0] && data.wfAmountRecords[0].wfExchangeBill) {
                self.selected(data.wfAmountRecords[0].wfExchangeBill);
            } else
                if (data.wfAmountRecords[0] && data.wfAmountRecords[0].wfExchangeBillId) {
                    base._get(options.loadBillUrl, { id: data.wfAmountRecords[0].wfExchangeBillId }, function (result) {
                        self.selected(result.data);
                    });
                }
        },
    };
    $.extend(this, _methods);
}