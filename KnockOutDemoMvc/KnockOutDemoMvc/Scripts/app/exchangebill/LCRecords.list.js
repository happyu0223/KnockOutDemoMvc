/**
* create by amy
* create date 2015-08-24
*/
"use strict";
var ns = utils.namespace('GMK.ExchangBill.LCRecords');

ns.start = function (data) {
    var baseUrl = 'ExchangeBill/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.ListViewModel(models, data, {
            searchUrl: baseUrl + 'GetLCList',
            deleteUrl: baseUrl + 'DeleteLC',
            setStatusUrl: baseUrl + 'SetLCStatus',
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
    self.commonModels = models;
    self.allCustomers = models._AllCustomers.slice().concat(models._AllBanks.slice()).concat(models._AllCorporations.slice());

    self.list = ko.observableArray();
    self.toquery = ko.mapping.fromJS(values.query);
    //存储查询后的币种信息
    self.queryedCurrencyId = ko.observable();

    self.pageSummary = {
        totalAmount: ko.observable(),
        totalAvailableAmount: ko.observable(),
        count : ko.observable(),
    };
    self.totalSummary = {
        totalAmount: ko.observable(),
        totalAvailableAmount: ko.observable(),
        count: ko.observable(),
    };

    self.autoComputed = ko.computed(function () {
        var count = 0, amount = 0, availableAmount = 0;
        $.each(self.list(), function (i, r) {
            count++;
            amount += r.amount;
            availableAmount += r.availableAmount;
        });

        self.pageSummary.count(count);
        self.pageSummary.totalAmount(amount);
        self.pageSummary.totalAvailableAmount(availableAmount);
    });

    var _methods = {
        findCurrencyCode: function (id) {
            var curr = models.findById(models.AllCurrencies, id);
            return curr ? curr.shortName : '';
        },
        findAccountingEntity: function (id) {
            var result = models.findById(models.AllAccountingEntities, id);
            return result ? result.name : '';
        },
        initialize: function (data) {
            self._search();
        },
        fill: function (result) {
            self.list.removeAll();
            self.list(result.data.list);
            self.totalSummary.totalAmount(result.data.summary.amount);
            self.totalSummary.totalAvailableAmount(result.data.summary.availableAmount);
            self.totalSummary.count(result.data.summary.count);

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
            }, true);
        },
        onSearch: function () {
            self._search();
        },
        onDelete: function (item) {
            base._delete(options.deleteUrl, { id: item.wfLetterOfCreditId }, function () {
                self._search();
            });
        },
        onSetStatus: function (item) {
            confirm("确认作废选择的信用证？", function () {
                base._post(options.setStatusUrl, { id: item.wfLetterOfCreditId, status: models.Enums.LetterOfCreditStatus.Unavailable }, function (result) {
                    self._search();
                });
            });
        }
    };

    $.extend(this, _methods);
}