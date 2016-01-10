/**
* create by amy
* create date 2015-09-08
*/
"use strict";
var ns = utils.namespace('GMK.CommercialInvoice.CommercialInvoices');

ns.start = function (data) {
    var baseUrl = 'CommercialInvoice/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.ManageViewModel(models, data, {
            loadUrl: baseUrl + 'GetInvoice',
            loadContractUrl: baseUrl + 'GetContracts',
            saveUrl: baseUrl + 'SavePreSettle',
            finalSettleUrl: data.finalSettleUrl,
        });
        viewModel.initialize(data);
        ko.applyBindings(viewModel);
    });
};

ns.ManageViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.commonModels = models;
    this.item = ko.mapping.fromJS(values.data);
    this.isPreSettle = ko.observable(false);
    this.isUserInput = ko.observable(false);
    this.root = {
        indexUrl: ko.observable(),
        indexName: ko.observable(),
    };
    this.detailSummary = {
        totalWeight: ko.observable(0),
        totalGrossWeight: ko.observable(0),
        totalAmount: ko.observable(0),
        count: ko.observable(0),
        totalBundles: ko.observable(0),
    };
    this.totalFinalAmount = ko.computed(function () {
        if (self.item.wfContractInvoices().length > 0) {
            var totalAmount = 0;
            $.each(self.item.wfContractInvoices(), function (i, r) {
                totalAmount += (utils.parseFloat(r.finalWeight() ? r.finalWeight() : r.weight()) * utils.parseFloat(r.finalPrice() ? r.finalPrice() : r.price()));
            });
            return utils.roundAmount(totalAmount);
        }
    });

    this.totalFinalWeight = ko.computed(function () {
        if (self.item.wfContractInvoices().length > 0) {
            var totalweight = 0;
            $.each(self.item.wfContractInvoices(), function (i, r) {
                totalweight += utils.parseFloat(r.finalWeight());
            });
            return utils.roundWeight(totalweight);
        }
    });

    this.item.finalTotalAmount.subscribe(function (newVal) {
        if (!isNaN(newVal)) {
            self.item.finalAvgPrice(utils.parseFloat(newVal) / self.item.totalWeight());
        }
    });

    this.invalids = {
        invoice: ko.observable(0)
    };
    this.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    this.setCustomShowErrors = {
        invoice: function () { self.customShowErrors(self.invalids.invoice); }
    };

    this.computedSummary = ko.computed(function () {
        if (self.item.wfContractInvoices().length > 0) {
            var totalWeight = 0, totalGrossWeight = 0, totalAmount = 0, count = 0, totalBundles = 0;
            $.each(self.item.wfContractInvoices(), function (i, r) {
                totalWeight += utils.parseFloat(r.weight());
                totalGrossWeight += utils.parseFloat(r.grossWeight());
                totalAmount += utils.parseFloat(r.amount());
                totalBundles += utils.parseFloat(r.bundles());
                count++;
            });
            self.detailSummary.totalAmount(utils.roundAmount(totalAmount));
            self.detailSummary.totalGrossWeight(utils.roundWeight(totalGrossWeight));
            self.detailSummary.totalWeight(utils.roundWeight(totalWeight));
            self.detailSummary.totalBundles(utils.roundWeight(totalBundles));
            self.detailSummary.count(count);
        }
    });
    this.autoComputed = ko.computed(function () {
        if (!self.isUserInput() && self.isPreSettle()) {
            // var amount = self.totalFinalAmount() + self.item.totalAmount() - self.detailSummary.totalAmount();
            var amount = self.totalFinalAmount() + utils.parseFloat(self.item.finalDiscountCost());
            self.item.finalTotalAmount(utils.roundAmount(amount));
        } 
    });

    var _methods = {
        initialize: function (data) {
            self.load();
        },
        setMenu: function (data) {
            if ((data.isReceive + '').toLowerCase() == 'true') {
                utils.setMenuHighlight("tab-li-commercialInvoice-receiveIndex");
            } else {
                utils.setMenuHighlight("tab-li-commercialInvoice-payIndex");
            }
        },
        load: function () {
            base._get(options.loadUrl, { id: values.id }, function (result) {
                var data = result.data.item;
                ko.mapping.fromJS(data, self.item);
                if (data.finalTotalAmount)
                    self.item.finalAvgPrice(data.finalTotalAmount / data.totalWeight);
                self.root.indexUrl('Index?isReceive=' + data.isReceive);
                self.root.indexName(data.isReceive ? '收票管理' : '开票管理');
                // self.isPreSettle(data.finalTotalAmount != null); //默认为直接显示预结算                
                if (data.finalTotalAmount != null) {
                    self.isUserInput(true);
                    self.item.finalTotalAmount(data.finalTotalAmount);
                }
                self.isPreSettle(true);
                self.setMenu(data);
            });
        },
        onSave: function () {
            if (self.isValid()) {
                var data = self.toJS();
                base._postThenBack(options.saveUrl, data);
            }
        },
        onSaveAndSettle: function () {
            if (self.isValid()) {
                var data = self.toJS();
                base._post(options.saveUrl, data, function (result) {
                    if (result) {
                        window.location.href = options.finalSettleUrl + '?isReceive=' + data.isReceive + '&tempInvoiceId=' + data.wfInvoiceRecordId + '&contractId=' + data.wfContractInfoId;
                    }
                });
            }
        },
        onSwitchChange: function () {
            self.isPreSettle(!self.isPreSettle());
            if (!self.isPreSettle()) {
                confirm('确定清空已设置的结算信息？', function () {
                    self.isPreSettle(false);
                    $.each(self.item.wfContractInvoices(), function (i, r) {
                        r.finalPrice(null);
                        r.finalWeight(null);
                    });
                    self.item.finalTotalAmount(null);
                    self.item.finalDiscountCost(null);
                }, function () {
                    self.isPreSettle(true);
                });
            }
        },
        onSetUserInput: function () {
            if (!self.isUserInput()) {
                self.isUserInput(true);
            } else {
                self.isUserInput(false);
            }
        },
        isValid: function () {
            var data = self.toJS();
            var isValid = true;
            $.each(data.wfContractInvoices, function (i, r) {
                if (isNaN(r.finalPrice)) {
                    isValid = false;
                    return false;
                }
            });
            if (isNaN(data.finalTotalAmount))
                isValid = false;
            return isValid;
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            data.isPresettle = self.isPreSettle();
            return data;
        },
    };

    $.extend(this, _methods);
};