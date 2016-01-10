var GMK = GMK || {};
GMK.RedeemSpot = GMK.RedeemSpot || {};
GMK.RedeemSpot.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'RedeemSpotIndex') {
            viewModel = new GMK.RedeemSpot.IndexViewModel(commonModels, route, {});
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
            viewModel.commonModels.registerQueryFormEvent();
        } else if (route.action === 'RedeemSpotCreate' || route.action === 'RedeemSpotEdit' || route.action === 'RedeemSpotDetails') {
            viewModel = new GMK.RedeemSpot.ManageViewModel(commonModels, route, {});
            if (viewModel) {
                viewModel.initialize(function () {
                    ko.applyBindings(viewModel, element);
                    if (route.action === 'RedeemSpotIndex') {
                        viewModel.commonModels.registerQueryFormEvent();
                    }
                    if (success) {
                        success();
                    }
                });
            }
        }
    });
};
GMK.RedeemSpot.ItemViewModel = function (plainItem, plainTrack, parent) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    var byPieceCommodityIds = $.map($.grep(parent.commonModels.AllCommodities, function (r) {
        return r.measureType === parent.commonModels.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });
    var commodityId = plainItem.CommodityId || plainItem.WFPledgeInfo.CommodityId;
    var isByPiece = $.inArray(commodityId, byPieceCommodityIds) !== -1;
    self.setTracks = function (newTracks, plainTrack) {
        $.each(newTracks || self.WFPledgeInfo.WFWhStorageFlowTracks(), function (i, r) {
            var npt = utils.find(self.WFWhStorageFlowTracks(), function (r1) {
                return r1.SourceWarehouseStorageId() === r.SourceWarehouseStorageId();
            });
            var checked = npt !== null;
            r.Checked = ko.observable(checked);
            var upper = utils.roundAmount(r.LeftPledgedWeight() + (checked ? npt.Weight() : 0), parent.commonModels.settings.weightDigits);
            r.Upper = ko.observable(upper);
            if (!checked && plainTrack) {
                npt = ko.mapping.fromJS(plainTrack);
                npt.SourceWarehouseStorageId(r.SourceWarehouseStorageId());
                npt.Weight(upper);
                if (isByPiece && !plainItem.WFUnPledgeInfoId) {
                    npt.ActualWeight(upper);
                }
            }
            r.npt = npt;
        });
        if (newTracks) self.WFPledgeInfo.WFWhStorageFlowTracks(newTracks);
        if (isByPiece) {
            self.WFPledgeInfo.WFWhStorageFlowTracks.removeAll($.grep(self.WFPledgeInfo.WFWhStorageFlowTracks(), function (r) {
                return !r.Checked() && !r.SourceWFWarehouseStorage.IsPledge();
            }));
        }
    }
    self.setTracks(null, plainTrack);
    self.AllChecked = ko.computed({
        read: function () {
            var checked = true;
            $.each(self.WFPledgeInfo.WFWhStorageFlowTracks(), function (i, r) {
                checked = checked && r.Checked();
                return checked;
            });
            return checked;
        },
        write: function (value) {
            var checked = !!value;
            $.each(self.WFPledgeInfo.WFWhStorageFlowTracks(), function (i, r) {
                r.Checked(checked);
            });
        }
    });
    self.toJs = function () {
        var item = $.extend({}, self);
        item.WFWhStorageFlowTracks($.map($.grep(self.WFPledgeInfo.WFWhStorageFlowTracks(), function (r) {
            return r.Checked();
        }), function (r) {
            return r.npt;
        }));
        delete item.WFPledgeInfo;
        return ko.mapping.toJS(item);
    };
    self.selected = ko.computed(function () {
        var sum = { Count: 0, Weight: 0, ActualWeight: 0 };
        $.each(self.WFPledgeInfo.WFWhStorageFlowTracks(), function (i, r) {
            if (r.Checked()) {
                sum.Count++;
                sum.Weight = utils.roundAmount(sum.Weight + utils.roundAmount(r.npt.Weight(), parent.commonModels.settings.weightDigits), parent.commonModels.settings.weightDigits);
                sum.ActualWeight = utils.roundAmount(sum.ActualWeight + utils.roundAmount(r.npt.ActualWeight(), parent.commonModels.settings.weightDigits), parent.commonModels.settings.weightDigits);
            }
        });
        if (plainTrack) {
            self.TotalWeight(sum.Weight);
        }
        return sum;
    });
    self.IsShowDetails = ko.observable(false);
};
GMK.RedeemSpot.ManageViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    if (route.action === 'RedeemSpotDetails' || route.action === 'RedeemSpotEdit') {
        self.initialize = function (callback) {
            base._get('Storage/GetRedeemSpot', { id: route.values.id }, function (result) {
                self.measureType = ko.observable((function () {
                    return ($.grep(self.commonModels.AllCommodities, function (elem) { return elem.id == result.Data.CommodityId; })[0] || {}).measureType;
                })());
                self.item = new GMK.RedeemSpot.ItemViewModel(result.Data, route.values.newTrack, self);
                ko.SlimCheckExtension.call(self, self.item.WFPledgeInfo.WFWhStorageFlowTracks, {
                    isSelectedObservable: function (elem) {
                        return elem.Checked;
                    }
                });
                callback();
            });
        };
    } else if (route.action === 'RedeemSpotCreate') {
        self.initialize = function (callback) {
            base._get('Storage/GetImpawnSpot', { id: route.values.newItem.WFPledgeInfoId }, function (result) {
                var plainItem = $.extend({}, route.values.newItem, {
                    WFPledgeInfo: result.Data,
                    Price: result.Data.Price,
                    CustomerId: result.Data.CustomerId
                });
                self.measureType = ko.observable((function () {
                    return ($.grep(self.commonModels.AllCommodities, function (elem) { return elem.id == result.Data.CommodityId; })[0] || {}).measureType;
                })());
                self.item = new GMK.RedeemSpot.ItemViewModel(plainItem, route.values.newTrack, self);
                ko.SlimCheckExtension.call(self, self.item.WFPledgeInfo.WFWhStorageFlowTracks, {
                    isSelectedObservable: function (elem) {
                        return elem.Checked;
                    }
                });
                callback();
            });
        };
    }
    if (route.action === 'RedeemSpotCreate' || route.action === 'RedeemSpotEdit') {
        self.onSave = function () {
            if (self.item.UnPledgeDate().valueOf() < new Date(self.item.WFPledgeInfo.PledgeStartDate()).valueOf()) {
                alert('解押日期必须晚于质押日期' + moment(new Date(self.item.WFPledgeInfo.PledgeStartDate())).format('YYYY-MM-DD'));
                return;
            }
            base._post('Storage/SaveRedeemRecord', self.item.toJs(), function (result) {
                location.href = route.redeemSpotIndexUrl;
            });
        };
        self.onBatchUpdateCardCode = function () {
            if (self.item.selected().Count == 0) {
                return alert('请先选择待解押的现货记录');
            }
            var tracks = $.map($.grep(self.item.WFPledgeInfo.WFWhStorageFlowTracks(), function (r) { return r.Checked(); }),
                function (r) { return { id: r.SourceWFWarehouseStorage.BrandId(), commodityId: r.SourceWFWarehouseStorage.CommodityId() } });
            self.settingBrands($.map(
                tracks.getUnique(function (arrItem) { return arrItem.id; }),
                function (r) {
                    return { id: r.id, name: self.commonModels.findBrand(r.id, r.commodityId) };
                }));
            $('#BatchCardCodeForm').modal('show');
        };
        function SettingBrandItem(brandName, brandId, cardCode) {
            this.brandName = ko.observable(brandName || '选择品牌');
            this.brandId = brandId;
            this.cardCode = ko.observable(cardCode);
            this.reset = function () {
                this.brandName('选择品牌');
                this.brandId = null;
                this.cardCode(null);
            }
        }
        self.batchCardCodes = ko.observableArray();
        self.fixedSettingCardCode = new SettingBrandItem();
        self.settingBrands = ko.observableArray();
        self.currentItem = null;
        self.selectSettingBrand = function (item) {
            var brand = {
                name: self.currentItem.brandName(),
                id: self.currentItem.brandId
            };
            self.currentItem.brandName(item.name);
            self.currentItem.brandId = item.id;
            self.settingBrands.remove(item);
            if (brand.id) self.settingBrands.push(brand);
        };
        self.onSelectBrand = function (item) {
            self.currentItem = item;
        };
        self.onRemoveSettingCardCode = function (item) {
            self.batchCardCodes.remove(item);
            self.settingBrands.push({
                name: item.brandName(),
                id: item.brandId
            });
        };
        self.onAddSettingCardCode = function (item, event) {
            if (!item.brandId || !item.cardCode()) return;
            self.batchCardCodes.push(new SettingBrandItem(item.brandName(), item.brandId, item.cardCode()));
            self.settingBrands.remove(function (item) { return item.id == item.brandId; });
            item.reset();
        };
        self.saveBatchCardCodes = function () {
            $.each(self.item.WFPledgeInfo.WFWhStorageFlowTracks(), function (i, item) {
                if (item.Checked()) {
                    var setting = $.grep(self.batchCardCodes(), function (elem) { return item.SourceWFWarehouseStorage.BrandId() == elem.brandId; });
                    if (!setting.length && self.fixedSettingCardCode.brandId == item.SourceWFWarehouseStorage.BrandId() && self.fixedSettingCardCode.cardCode) {
                        setting = [self.fixedSettingCardCode];
                    }
                    if (setting.length) item.npt.TargetWFWarehouseStorage.GroupCode(setting[0].cardCode());
                }
            });
            self.batchCardCodes([]);
            self.fixedSettingCardCode.reset();
        };
    }
    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
};
GMK.RedeemSpot.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.query = ko.observable(ko.mapping.fromJS(route.values.query));
    self.currQuery = ko.mapping.toJS(self.query());
    self.items = ko.observableArray();
    self.currentWeights = ko.observable();
    self.items.subscribe(function () {
        var w = 0;
        $.each(self.items(), function (i, item) {
            w += utils.parseFloat(item.TotalWeight());
        });
        self.currentWeights(w);
    });
    self.totalCount = ko.observable();
    self.totalWeights = ko.observable();
    var searchUrl = 'Storage/ListRedeemSpot';
    self.initialize = function () {
        if (route.values.pledgeInfoId) {
            base._get(searchUrl, {pledgeInfoId: route.values.pledgeInfoId}, function (result) {
                self.fillItems(result);
            });
        } else {
            self.search();
        }
    };
    self.onSearch = function () {
        self.search();
    };
    self.search = function () {
        self.query().Pagination.CurrentPage(1);
        self.currQuery = ko.mapping.toJS(self.query());
        base._get(searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
        });
    };
    var expandingItem, $divQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.toggleDetails(self.items()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }
    self.fillItems = function (result) {
        self.currQuery.Pagination = result.Data.pagination;
        self.query(ko.mapping.fromJS(self.currQuery));
        var items = $.map(result.Data.list, function (r) {
            var elem = new GMK.RedeemSpot.ItemViewModel(r, null, self);
            elem.measureType = ko.observable((function () {
                return ($.grep(self.commonModels.AllCommodities, function (elem1) { return elem1.id == elem.CommodityId(); })[0] || {}).measureType;
            })());
            return elem;
        });
        self.items(items);
        self.totalCount(result.Data.summary.TotalCount);
        self.totalWeights(result.Data.summary.TotalWeight);
        _initializeExpandable();
        base._paginate($(route.values.pager), $.extend(true, {}, self.currQuery.Pagination), function () {
            return $.extend(true, {}, self.currQuery);
        }, searchUrl, self.fillItems, function (q, p) {
            if (!self.currQuery.Pagination) self.currQuery.Pagination = {};
            self.currQuery.Pagination.CurrentPage = p.currentPage || p.CurrentPage || 1;
            return $.extend(true, {}, self.currQuery);
        });
    };
    self.onDelete = function (item) {
        base._delete('Storage/DeleteRedeemRecord', { id: item.WFUnPledgeInfoId() }, function () {
            self.items.remove(item);
            self.initialize();
        });
    };
    self.toggleDetails = function (item) {
        var isShowDetails = item.IsShowDetails();
        if (!isShowDetails && !(item.WFWhStorageFlowTracks().length && item.WFPledgeInfo.WFWhStorageFlowTracks().length)) {
            base._get('Storage/GetRedeemSpot', { id: item.WFUnPledgeInfoId() }, function (result) {
                item.setTracks(ko.mapping.fromJS(result.Data.WFPledgeInfo.WFWhStorageFlowTracks)(), null);
                item.IsShowDetails(true);
                if (expandingItem) $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
            });
        }
        item.IsShowDetails(!isShowDetails);
    };
};
