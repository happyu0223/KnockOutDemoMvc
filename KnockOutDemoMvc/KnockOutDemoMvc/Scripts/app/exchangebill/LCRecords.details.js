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
        viewModel = new ns.DetailsViewModel(models, data, {
            loadLCUrl: baseUrl + 'GetLC'
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

    var _methods = {
        initialize: function (data) {
            self.loadLC();
        },
        loadLC: function () {
            base._get(options.loadLCUrl, { id: values.lcId }, function (result) {
                var data = result.data.item;
                ko.mapping.fromJS(data, self.item);
            });
        },
    };

    $.extend(this, _methods);
};