var GMK = GMK || {};
GMK.BasicGapReport = GMK.BasicGapReport || {};
GMK.BasicGapReport.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'BasicGap') {
            var viewModel = new GMK.BasicGapReport.IndexViewModel(commonModels, route, {
                searchUrl: 'Report/BasicGapList'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        }
    });
};
GMK.BasicGapReport.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    var today = moment(0, 'HH');
    var d1mb = moment(today).add('M', -1);
    self.currQuery = {
        query: {
            StartTime: d1mb.toJSON(),
            EndTime: today.toJSON(),
            ContractCode: ''
        },
        pagination: {
            CurrentPage: 1,
            PageSize: 10,
            TotalCount: 0,
            PageCount: 1
        }
    };
    self.query = ko.mapping.fromJS(self.currQuery);
    self.initialize = function (callback) {
        self.search(callback);
    };
    self.onSearch = function () {
        self.search();
    };
    self.search = function (callback) {
        self.currQuery = ko.mapping.toJS(self.query);
        base._post(options.searchUrl, self.currQuery, function (result) {
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        self.currQuery.pagination = result.Data.pagination;
        for (var m in self.currQuery.pagination) {
            self.query.pagination[m](self.currQuery.pagination[m]);
        }
        //self.items.removeAll();
        //$.each(result.Data.result, function (i, r) {
        //    self.items.push(new GMK.BasicGapReport.ListItemViewModel(r));
        //});
        self.items(ko.mapping.fromJS(result.Data.result)());
        base._paginate($(route.values.pager), result.Data.pagination, function () {
            return self.currQuery;
        }, options.searchUrl, self.fill, function (q, pagination) {
            q.pagination = pagination;
            return q;
        });
    };
};
