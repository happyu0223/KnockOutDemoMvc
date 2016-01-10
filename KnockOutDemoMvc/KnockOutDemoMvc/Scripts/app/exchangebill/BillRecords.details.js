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
        viewModel = new ns.DetailsViewModel(models, data, {
            loadBillUrl: baseUrl + 'GetBill'
        });
        viewModel.initialize(data);
        ko.applyBindings(viewModel);
    });
};

ns.DetailsViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.commonModels = models;
    self.item = ko.mapping.fromJS(values.data);
    var billTypes = models.Enums.ExchangeBillType;
    //即期远期判断
    self.isUsance = ko.computed(function () {
        var type = self.item.type();
        return models.isNotSightBillType(type);
    });
    var _methods = {
        initialize: function (data) {
            self.loadBill();
        },
        loadBill: function () {
            base._get(options.loadBillUrl, { id: values.billId }, function (result) {
                var data = result.data.item;                
                ko.mapping.fromJS(data, self.item);
            });
        },
    };

    $.extend(this, _methods);
};