var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.CommodityTimeline = GMK.Storage.CommodityTimeline || {};
GMK.Storage.CommodityTimeline.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.Storage.CommodityTimeline.IndexViewModel({
            id: $('#gmk-route').data('id'),
        }, {
            listUrl: 'storage/ListCommodityFlows'
        });
        // ko.applyBindings(viewModel);
        viewModel.initialize(models);
    });
};

GMK.Storage.CommodityTimeline.IndexViewModel = function (data, actions) {
    var self = this, base = GMK.Features.FeatureBase;
    self.initialize = function (models) {
        base._get(actions.listUrl, { id: data.id }, function (data) {

            if (data.data.storage.WhStorageType == models.Enums.InventoryStorageType.Receipt) {
                utils.setMenuHighlight("tab-li-storage-receiptIndex");
            } else {
                utils.setMenuHighlight("tab-li-storage-spotIndex");
            }

            function loadTimeline() {
                $('.timeline').verticalTimeline({ data: data.data.result, width: '80%', groupFunction: 'groupSegmentByYear', defaultDirection: 'oldest' });
            }
            $(window).resize(function () {
                loadTimeline();
            });
            loadTimeline();
        });
    };
};

$(function () {
    GMK.Storage.CommodityTimeline.start();
});