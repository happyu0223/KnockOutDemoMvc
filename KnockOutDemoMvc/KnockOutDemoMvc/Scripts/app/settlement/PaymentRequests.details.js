/**
* create by amy
* create date 2015-08-28
*/
"use strict";
var ns = utils.namespace('GMK.Settlement.PaymentRequests');

ns.start = function (data) {
    var baseUrl = 'Settlement/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new ns.DetailsViewModel(models, {
            loadUrl: baseUrl + 'GetPaymentRequest',
            loadKey: data.requestId,
            payData: data.payData
        });
        window.vm = viewModel;
        viewModel.initialize();
        ko.applyBindings(viewModel);
    });
};

ns.DetailsViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    this.contractList = ko.observableArray();
    this.payRequestDetails = ko.observableArray();
    this.invoiceList = ko.observableArray();
    this.item = ko.mapping.fromJS(options.payData);

    this.account = ko.computed(function () {
        var customer = models.findById(models._AllCompanies, self.item.PayCustomerId());
        if (customer) {
            return models.findById(customer.accounts, self.item.CompanyBankInfoId());
        }
    });
    this.currency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.item.CurrencyId());
    });
    this.actualCurrency = ko.computed(function () {
        return models.findById(models.AllCurrencies, self.item.ActualCurrencyId());
    });
    this.exchangeRate = ko.computed(function () {
        if (self.item.ExchangeRateId() && self.item.CurrencyId() != self.item.ActualCurrencyId()) {
            return {
                rate: self.item.ExchangeRate,
                pair: models.findById(models.AllCurrencyPairs, self.item.ExchangeRate.WFCurrencyPairId()),
            };
        }
    });

    this.exchangeBill = ko.computed(function () {
        if (self.item.WFAmountRecords().length > 0) {
            var data = self.item.WFAmountRecords()[0].WFExchangeBill;
            if (typeof(data) == 'object') {
                var currency = models.findById(models.AllCurrencies, data.CurrencyId());
                var currencyCode = currency ? currency.symbol + currency.code : '';
                var summary = "票据编号：{0}，<br />开票人：{1}，<br />持票人：{2}，<br />核算主体：{3}，金额：{4} {5}".format(
                    data.Code(), models.findCustomer(data.DrawerId()), models.findCustomer(data.HolderId()),
                    models.findAccountingEntity(data.AccountingEntityId()),
                    currencyCode, utils.formatAmount(data.Amount()));

                return {
                    bill: data,
                    summary : summary
                };
            }
        }
    });

    this.fillContract = function (data, prds) {
        var item, result = [];
        self.contractList.removeAll();
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var detail = $.grep(prds, function (elem) {
                return elem.WFContractInfoId == item.WFContractInfoId;
            })[0];
            item.Amount = detail.Amount * (item.IsBuy ? 1 : -1);
            item.ActualCurrencyAmount = detail.ActualCurrencyAmount * (item.IsBuy ? 1 : -1);
            result.push(item);
        }
        self.contractList(result);
    };

    this.fillRequest = function (record) {
        var data = record.PayRequest;
        ko.mapping.fromJS(data, self.item);
    };

    this.fillPayRequestDetails = function (association) {
        self.payRequestDetails($.map(association, function (item) {
            return {
                feeName: item.WFSystemFee.FeeName,
                startDate: item.StartDate,
                endDate: item.EndDate,
                amount: item.Amount,
                customerId: item.CustomerId
            };
        }));
    };

    this.fillInvoice = function (data, prds) {
        var item, result = [];
        self.invoiceList.removeAll();
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var detail = $.grep(prds, function (elem) {
                return elem.ObjectId == item.WFInvoiceRecordId;
            })[0];
            item.Amount = detail.Amount * (item.WFInvoiceRecord.IsReceive ? 1 : -1);
            item.ActualCurrencyAmount = detail.ActualCurrencyAmount * (item.WFInvoiceRecord.IsReceive ? 1 : -1);
            result.push(item);
        }
        self.invoiceList(result);
    };

    this.initialize = function () {
        base._get(options.loadUrl, { id: options.loadKey }, function (result) {
            var data = result.Data, types = models.Enums.AmountDetailObjectType, customers;
            self.fillRequest(data);
            switch (data.PayRequest.DetailObjectType) {
                case types.Contract:
                    self.fillContract(data.Association, data.PayRequest.WFPayRequestDetails);
                    break;
                case types.WarehouseFee:
                    self.fillPayRequestDetails(data.Association);
                    break;
                case types.LogisticsFee:
                    self.fillPayRequestDetails(data.Association);
                    break;
                case types.CommercialInvoice:
                    self.fillInvoice(data.Association, data.PayRequest.WFPayRequestDetails);
                    break;
            }
        });
    }
};