/**
 * Created by dawson.liu on 13-10-10.
 */

var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.ByCommodity = GMK.Report.ByCommodity || {};

GMK.Report.ByCommodity.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.Report.ByCommodity.ListViewModel(models, {
            searchUrl: 'Report/ListContractJournalReport',
            exportUrl: 'Report/ExportContractJournalReport',
            relationsUrl: 'Report/GetContractRelations'
        });
        viewModel.initialize();
        ko.applyBindings(viewModel);
        viewModel.registerQueryFormEvent();
    });
};

GMK.Report.ByCommodity.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.IsBuy = ko.observable(true);
        vm.list = ko.observableArray();
    }

    viewModel.call(this);

    var expandingItem, $tableQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($tableQueryResult.expandable('instance')) $tableQueryResult.expandable('destroy');
        $tableQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.onShowRelations(self.list()[parseInt($(e.target.closest('tr')[0]).attr('id').substr('state_'.length), 10)]);
            }
        });
    }
    self.fill = function (result) {
        self.list.removeAll();
        if (result.Data.result != null) {
            for (var i = 0; i < result.Data.result.length; i++) {
                self.list.push($.extend(result.Data.result[i], { relations: ko.observableArray() }));
            }
        }
        _initializeExpandable();
        base._p(result.Data.pagination, options.searchUrl, self.fill, function () {
            var query = utils.serialize("#searchForm .gmk-data-field");
            if (query.CommodityId == null || query.CommodityId == '') {
                query.CommodityId = models.AllCommodities[0].id;
            }
            return query;
        });
    }

    self.onSearch = function () {
        var query = utils.serialize("#searchForm .gmk-data-field");
        if (query.CommodityId == null || query.CommodityId == '') {
            query.CommodityId = models.AllCommodities[0].id;
        }

        base._get(options.searchUrl, query, function (data) {
            self.fill(data);
            self.IsBuy(query.IsBuy == 'true');
        }, true);
    };

    self.onShowRelations = function (item) {
        if (item.relations().length == 0) {
            base._get(options.relationsUrl, { id: item.WFContractDetailInfoId }, function (data) {
                item.relations(data);
                if (expandingItem) $tableQueryResult.expandable('expanded.expandable', {target:expandingItem});
                expandingItem = null;
            }, true);
        }
    };

    self.onExport = function () {
        utils.fileDownload(utils.urlAction('ExportContractJournal', 'Report', utils.serialize('#searchForm form .gmk-data-field')));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var url = utils.urlAction('ExportContractJournal', 'Report', { downloadToken: downloadToken });
        //    $form.attr('action', url);
        //    $form.empty();
        //    var params = $.map($('#searchForm form .gmk-data-field'), function (r) {
        //        return $('<input type="hidden" />').attr('name', $(r).attr('name')).val($(r).val())[0];
        //    });
        //    $form.append(params);
        //});
        //base._post(options.exportUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
        //    if (data.Data) {
        //        window.location.assign(data.Data);
        //    }
        //});
    };

    self.initialize = function () {
        self.onSearch();
    };
}

$(document).ready(function () {
    GMK.Report.ByCommodity.start();
});