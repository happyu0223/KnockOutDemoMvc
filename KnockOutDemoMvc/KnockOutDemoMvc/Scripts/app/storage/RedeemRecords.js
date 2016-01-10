/**
 * Created by dawson.liu on 13-9-10.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.RedeemRecords = GMK.Storage.RedeemRecords || {};

GMK.Storage.RedeemRecords.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var $route = $("#gmk-route"), action = $route.data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.Storage.RedeemRecords.ManageViewModel(models, {
                listUrl: 'Storage/RedeemRecords',
                getImpawnUrl: 'Storage/GetImpawnRecord',
                getUrl: 'Storage/GetRedeemRecord',
                saveUrl: 'Storage/SaveRedeemRecord',
                pledgeInfoId: url.param('pledgeInfoId'),
                id: url.param('id')
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else {
            var viewModel = new GMK.Storage.RedeemRecords.ListViewModel(models, {
                pledgeInfoId: $route.data('pledge-info-id'),
                searchUrl: 'Storage/ListRedeemRecords',
                deleteUrl: 'Storage/DeleteRedeemRecord'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
        }
    });
};

GMK.Storage.RedeemRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.currentWeights = ko.observable();
        vm.list.subscribe(function () {
            var w = 0;
            $.each(vm.list(), function (i, item) {
                w += utils.parseFloat(item.TotalWeight);
            });
            vm.currentWeights(w);
        });
        vm.totalCount = ko.observable();
        vm.totalWeights = ko.observable();
        vm.fill = function (data) {
            vm.list(data.result);
            vm.totalCount(data.summary.TotalCount);
            vm.totalWeights(data.summary.TotalWeight);
            if (options.pledgeInfoId) {
                base._p(data.pagination, options.searchUrl + '?pledgeInfoId=' + options.pledgeInfoId, vm.fill, function () {
                    var query = $.extend({}, utils.serialize("#searchForm .gmk-data-field"), { IsSpot: false });
                    if (query.CommodityId == null || query.CommodityId == "") { //默认给品种id赋值
                        query.CommodityId = models.UserCommodities[0].id;
                    }
                    return query;
                });
            } else {
                base._p(data.pagination, options.searchUrl, vm.fill, function () {
                    var query = $.extend({}, utils.serialize("#searchForm .gmk-data-field"), { IsSpot: false });
                    if (query.CommodityId == null || query.CommodityId == "") { //默认给品种id赋值
                        query.CommodityId = models.UserCommodities[0].id;
                    }
                    return query;
                });
            }
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        var query = $.extend({}, utils.serialize("#searchForm .gmk-data-field"), { IsSpot: false });
        if (query.CommodityId == null || query.CommodityId == "") { //默认给品种id赋值
            query.CommodityId = models.UserCommodities[0].id;
        }
        base._get(options.searchUrl, query, function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFUnPledgeInfoId }, function () {
            self.list.remove(item);
            self.initialize();
        });
    };

    self.initialize = function () {
        if (options.pledgeInfoId) {
            base._get(options.searchUrl, { PledgeInfoId: options.pledgeInfoId }, function (contracts) {
                self.fill(contracts);
            }, true);
        } else {
            self.onSearch();
        }
    };
}

GMK.Storage.RedeemRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;

        vm.receiptList = ko.observableArray();
        vm.selectedWeight = ko.observable(0);
        vm.selectedCount = ko.computed(function () {
            var count = 0, weight = 0;
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) { count++; weight += item.Weight }
            });
            //js floating number bug
            vm.selectedWeight(utils.formatWeight(weight));
            return count;
        });
        vm.isSpecial = ko.observable(false);

        vm.toJson = function () {
            var unpledgeInfo = utils.serialize("#mainForm .gmk-data-field");
            var storageFlowTracks = [];
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) {
                    storageFlowTracks.push({
                        SourceWarehouseStorageId: item.WFWarehouseStorageId
                    });
                }
            });
            unpledgeInfo.WFUnPledgeInfoId = options.id;
            unpledgeInfo.CommodityId = vm.PledgeInfo.CommodityId;
            unpledgeInfo.PledgeInterestRate = vm.PledgeInfo.PledgeInterestRate;
            unpledgeInfo.WFPledgeInfoId = vm.PledgeInfo.WFPledgeInfoId;
            unpledgeInfo.PledgeRate = vm.PledgeInfo.PledgeRate;
            unpledgeInfo.WFWhStorageFlowTracks = storageFlowTracks;
            unpledgeInfo.TradeType = vm.tradeType;
            return unpledgeInfo;
        }
        vm.fill = function (data) {
            data.UnpledgeInfo.Customer = models.findCustomer(data.UnpledgeInfo.CustomerId);
            utils.deserialize("#mainForm .gmk-data-field", data.UnpledgeInfo);
            vm.tradeType = data.UnpledgeInfo.TradeType;
            $.each(vm.receiptList(), function (j, r) {
                $.each(data.WarehouseStorages, function (i, item) {
                    if (item.WFWarehouseStorageId == r.WFWarehouseStorageId) {
                        r.isSelected(true);
                    }
                });
            });
        }

        function _isSpecial(commodity, customer) {
            return vm.isSpecialReceiptExchange(customer) && (
                ($.grep(vm.AllCommodities, function (item) { return item.id == commodity })[0] || {}).measureType == vm.Enums.CommodityMeasureType.ByPiece);
        }
        vm.fillPledgeInfo = function (data) {
            vm.receiptList(data.WarehouseStorages);

            vm.PledgeInfo = data.PledgeInfo;
            var defaultValues = {
                Price: data.PledgeInfo.Price,
                UnitId: data.PledgeInfo.UnitId,
                CustomerId: data.PledgeInfo.CustomerId
            };
            var customer = $.grep(vm._AllBrokers.concat(vm._AllExchanges), function (item) { return item.id == defaultValues.CustomerId; });
            defaultValues.Customer = customer.length ? customer[0].name : $.grep(vm._AllCustomers, function (item) { return item.id == defaultValues.CustomerId; })[0].name;
            utils.deserialize("#mainForm .gmk-data-field", defaultValues);
            vm.isSpecial(_isSpecial(data.PledgeInfo.CommodityId, data.PledgeInfo.CustomerId));
        };
    }

    viewModel.call(this);
    ko.SlimCheckExtension.call(this, this.receiptList);

    self.onSave = function () {
        if (moment($('#UnPledgeDate').val(), 'YYYY-MM-DD').toDate().valueOf() < new Date(self.PledgeInfo.PledgeStartDate).valueOf()) {
            alert('解押日期必须大于质押日期'+moment(new Date(self.PledgeInfo.PledgeStartDate)).format('YYYY-MM-DD'));
            return;
        }
        base._saveThenBack(options.saveUrl, self.toJson());
    };

    self.initialize = function () {
        if (options.pledgeInfoId) {
            base._get(options.getImpawnUrl, { id: options.pledgeInfoId }, function (data) {
                data.WarehouseStorages = $.grep(data.WarehouseStorages, function (item, i) {
                    if (!item.IsPledge) return false;
                    item.isSelected = ko.observable(false);
                    return true;
                });
                self.fillPledgeInfo(data);
            }, !!!options.id);
        }

        if (options.id) {
            base._get(options.getUrl, { id: options.id }, function (redeemRecord) {
                base._get(options.getImpawnUrl, { id: redeemRecord.UnpledgeInfo.WFPledgeInfoId }, function (data) {
                    data.WarehouseStorages = $.grep(data.WarehouseStorages, function (item, i) {
                        var result = false;
                        for (var i = 0, items = redeemRecord.WarehouseStorages, length = items.length; i < length; i++) {
                            if (items[i].WFWarehouseStorageId == item.WFWarehouseStorageId) {
                                result = true;
                                break;
                            }
                        }
                        if (!result && !item.IsPledge) return false;
                        item.isSelected = ko.observable(false);
                        return true;
                    });
                    self.fillPledgeInfo(data);
                    self.fill(redeemRecord);
                }, true);
            }, false);
        }
    };
    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
}

$(document).ready(function () {
    GMK.Storage.RedeemRecords.start();
});