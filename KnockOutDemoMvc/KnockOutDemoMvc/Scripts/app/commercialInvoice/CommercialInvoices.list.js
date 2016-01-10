/**
* create by amy
* create date 2015-09-07
*/
"use strict";
var ns = utils.namespace('GMK.CommercialInvoice.CommercialInvoices');

ns.start = function (data) {
    var baseUrl = 'CommercialInvoice/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.ListViewModel(models, data, {
            searchUrl: baseUrl + 'ListInvoice',
            deleteUrl: baseUrl + 'DeleteInvoice',
            loadDetailsUrl : baseUrl + 'GetInvoiceDetails',
        });
        ko.applyBindings(viewModel);
        viewModel.commonModels.registerQueryFormEvent();
        utils.responseStateChange();
        models.registerStateChange(viewModel.initialize(data));
    });
};

ns.ListViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.commonModels = models;
    self.values = values;
    this.allCustomers = models._AllCustomers.slice().concat(models._AllBanks.slice()).concat(models._AllCorporations.slice());

    this.list = ko.observableArray();
    this.toquery = ko.mapping.fromJS(values.query);
    //存储查询后的币种信息
    this.queryedCurrencyId = ko.observable();
    this.queryedCommodityId = ko.observable();
    this.pageSummary = {
        totalAmount: ko.observable(),
        totalHappendAmount : ko.observable(),
        totalWeight: ko.observable(),
        count : ko.observable(),
    };
    this.totalSummary = {
        totalAmount: ko.observable(),
        totalHappendAmount: ko.observable(),
        totalWeight: ko.observable(),
        count: ko.observable(),
    };

    var expandingItem, $divQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.loadDetails(self.list()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }

    var _methods = {
        findCurrencyCode: function (id) {
            var curr = models.findById(models.AllCurrencies, id);
            return curr ? curr.shortName : '';
        },
        initialize: function (data) {
            self._search();
        },
        fill: function (result, initializeExpandable) {
            if (initializeExpandable == undefined) initializeExpandable = true;
            self.list.removeAll();
            var list = result.data.list.commercialInvoices;
            var amount = 0, weight = 0, count = 0,happendAmount = 0;
            $.each(list, function (i,r) {
                r.wfContractInvoices = ko.observableArray(r.wfInvoiceRecord.wfContractInvoices);
                r.tempCommercialInvoices = ko.observableArray(r.tempCommercialInvoices);
                count++;
                amount += r.wfInvoiceRecord.totalAmount;
                weight += r.wfInvoiceRecord.totalWeight;
                happendAmount += r.totalHappendAmount;
            })
            self.list(list);

            self.totalSummary.totalAmount(result.data.list.amount);
            self.totalSummary.totalHappendAmount(result.data.list.totalHappenedAmount);
            self.totalSummary.totalWeight(result.data.list.weight);
            self.totalSummary.count(result.data.list.count);

            self.pageSummary.totalAmount(amount);
            self.pageSummary.totalWeight(weight);
            self.pageSummary.totalHappendAmount(happendAmount);
            self.pageSummary.count(count);

            if (initializeExpandable) _initializeExpandable();
            base._p(result.data.pagination, options.searchUrl, self.fill, function () {
                return ko.mapping.toJS(self.toquery);
            });
        },
        _search: function () {
            utils.responseStateChange(false);
            var query = ko.mapping.toJS(self.toquery);
            base._get(options.searchUrl, query, function (result) {
                self.fill(result);
                self.queryedCurrencyId(query.currencyId);
                self.queryedCommodityId(query.commodityId);
            }, true);
        },
        onSearch: function () {
            self._search();
        },
        onDelete: function (item) {
            base._delete(options.deleteUrl, { id: item.wfInvoiceRecordId }, function () {
                self._search();
            });
        },
        loadDetails: function (item) {
            if (!item.isLoaded) {
                base._get(options.loadDetailsUrl, { id: item.wfInvoiceRecordId }, function (result) {
                    if (item.isFinal && item.isBalance) {
                        var list = result.data.list, weight = 0;
                        $.each(list, function (i, detail) {
                            $.each(detail.wfInvoiceRecord.wfContractInvoices, function (j, invoice) {
                                weight += invoice.finalWeight;
                            });
                            detail.finalTotalWeight = weight;
                        });

                        item.tempCommercialInvoices(list);
                    } else {
                        item.wfContractInvoices(result.data.list);
                    }
                    item.isLoaded = true;
                });
            }  
        },
        onPrintAll: function (item) {
            utils.openWindow().redirectTo(GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({ templateType: models.Enums.BillTemplateType.CertificateOfOrigin, dataSourceId: item.wfInvoiceRecordId }));
            utils.openWindow().redirectTo(GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({ templateType: models.Enums.BillTemplateType.CertificateOfAnalysis, dataSourceId: item.wfInvoiceRecordId }));
            utils.openWindow().redirectTo(GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({ templateType: models.Enums.BillTemplateType.WeightCertificate, dataSourceId: item.wfInvoiceRecordId }));
            utils.openWindow().redirectTo(GMK.Context.RootUrl + 'Template/ArchiveIndex?' + $.param({ templateType: models.Enums.BillTemplateType.CommercialInvoice, dataSourceId: item.wfInvoiceRecordId }));
        },
    };

    $.extend(this, _methods);
}