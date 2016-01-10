/**
 * Created by dawson.liu on 13-10-8.
 */

var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.Timeline = GMK.Contract.Timeline || {};

GMK.Contract.Timeline.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var url = $.url();
        var viewModel = new GMK.Contract.Timeline.MainViewModel(models, {
            getUrl: 'Contract/Get',
            buildTimelineUrl: 'Contract/BuildTimeline',
            id: url.param('id')
        });
        viewModel.initialize();
        ko.applyBindings(viewModel);
    });
};

GMK.Contract.Timeline.MainViewModel = function (models, options){
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contract = ko.observable();
        vm.details = ko.observableArray();

        vm.fill = function (data) {
            vm.contract(data);
            vm.details(data.WFContractDetailInfoes);
        };
    }

    viewModel.call(this);

    self.initialize = function () {
        if (options.id) {
            base._get(options.getUrl, { id: options.id }, function (data) {
                self.fill(data);

                base._get(options.buildTimelineUrl, { id: options.id }, function(data){
                    $('.timeline').verticalTimeline({ data: data, width: '80%' });
                }, true)
            })
        }
    }
};

$(document).ready(function () {
    GMK.Contract.Timeline.start();
});
