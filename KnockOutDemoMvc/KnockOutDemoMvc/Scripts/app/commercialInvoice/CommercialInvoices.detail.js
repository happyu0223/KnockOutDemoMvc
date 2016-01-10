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
        viewModel = new ns.DetailsViewModel(models, data, {
            loadUrl: baseUrl + 'GetInvoice',
            loadContractUrl: baseUrl + 'GetContracts',
        });
        viewModel.initialize(data);
        ko.applyBindings(viewModel);
    });
};

ns.DetailsViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.commonModels = models;
    this.item = ko.mapping.fromJS(values.data);
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
        totalFinalWeight: ko.observable(),
        totalFinalAmount :ko.observable(),
    };

    this.detailTotalSummary = {
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

    this.isDetailsView = ko.computed(function () {
        return !(self.item.isFinal() && self.item.isBalance());
    });

    this.correspondentBank = ko.computed(function () {
        if (self.item.customerId() && self.item.correspondentBank() && self.item.isReceive()) {
            var customer = models._findCompany(self.item.customerId());
            if (customer != null) {
                return models.findById(customer.accounts, self.item.correspondentBank());
            }
        } else if (self.item.corporationId() && self.item.correspondentBank() && !self.item.isReceive()) {
            var customer = models._findCompany(self.item.corporationId());
            if (customer != null) {
                return models.findById(customer.accounts, self.item.correspondentBank());
            }
        }
    });

    this.beneficiaryBank = ko.computed(function () {
        if (self.item.customerId() && self.item.beneficiaryBankAccountId() && self.item.isReceive()) {
            var customer = models._findCompany(self.item.customerId());
            if (customer != null) {
                return models.findById(customer.accounts, self.item.beneficiaryBankAccountId());
            }
        } else if (self.item.corporationId() && self.item.beneficiaryBankAccountId() && !self.item.isReceive()) {
            var customer = models._findCompany(self.item.corporationId());
            if (customer != null) {
                return models.findById(customer.accounts, self.item.beneficiaryBankAccountId());
            }
        }
    });

    this.computedSummary = ko.computed(function () {
        if (self.item.wfContractInvoices().length > 0) {
            var totalWeight = 0, totalGrossWeight = 0, totalAmount = 0, count = 0, totalBundles = 0,totalFinalWeight = 0,totalFinalAmount =0;
            $.each(self.item.wfContractInvoices(), function (i, r) {
                totalWeight += utils.parseFloat(r.weight());
                totalGrossWeight += utils.parseFloat(r.grossWeight());
                totalAmount += utils.parseFloat(r.amount());
                totalBundles += utils.parseFloat(r.bundles());
                totalFinalWeight += utils.parseFloat(r.finalWeight());
                totalFinalAmount += utils.parseFloat(r.finalWeight() * r.finalPrice());
                count++;
            });
            self.detailSummary.totalAmount(totalAmount);
            self.detailSummary.totalGrossWeight(totalGrossWeight);
            self.detailSummary.totalWeight(totalWeight);
            self.detailSummary.totalBundles(totalBundles);
            self.detailSummary.count(count);
            self.detailSummary.totalFinalAmount(totalFinalAmount);
            self.detailSummary.totalFinalWeight(totalFinalWeight);
        }

        if (self.item.tempCommercialInvoices().length > 0) {
            var totalWeight = 0, totalGrossWeight = 0, totalAmount = 0, count = 0, totalBundles = 0, totalHappened = 0, totalFinalAmount = 0, totalFinalWeight = 0;
            var list = ko.mapping.toJS(self.item.tempCommercialInvoices());
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
            self.detailTotalSummary.totalTempAmount(totalAmount);
            self.detailTotalSummary.totalGrossWeight(totalGrossWeight);
            self.detailTotalSummary.totalBundles(totalBundles);
            self.detailTotalSummary.count(count);
            self.detailTotalSummary.totalHappendAmount(totalHappened);
            self.detailTotalSummary.totalFinalAmount(totalFinalAmount);
            self.detailTotalSummary.totalTempWeight(totalWeight);
            self.detailTotalSummary.totalFinalWeight(totalFinalWeight);
        }

    });

    var _methods = {
        initialize: function (data) {
            self.load();
        },
        load: function () {
            base._get(options.loadUrl, { id: values.id }, function (result) {
                var data = result.data.item;
                $.each(data.tempCommercialInvoices, function (i, r) {
                    var finalWeight = 0;
                    $.each(r.wfContractInvoices, function (j, detail) {
                        finalWeight += detail.finalWeight;
                    });
                    r.finalTotalWeight = finalWeight;
                });

                ko.mapping.fromJS(data, self.item);
                self.root.indexUrl('Index?isReceive=' + data.isReceive);
                self.root.indexName(data.isReceive ? '收票管理' : '开票管理');
                self.setMenu(data);
                base._get(options.loadContractUrl + '?' + $.param({ contractIds: [data.wfContractInfoId] }, true), null, function (contractResult) {
                    var list = contractResult.data.list;
                    self.item.wfContractInfo(list[0]);
                    $("#invoiceDetailTable").expandable();
                });
            });
        },
        setMenu: function (data) {
            if ((data.isReceive + '').toLowerCase() == 'true') {
                utils.setMenuHighlight("tab-li-commercialInvoice-receiveIndex");
            } else {
                utils.setMenuHighlight("tab-li-commercialInvoice-payIndex");
            }
        },
    };

    $.extend(this, _methods);
};