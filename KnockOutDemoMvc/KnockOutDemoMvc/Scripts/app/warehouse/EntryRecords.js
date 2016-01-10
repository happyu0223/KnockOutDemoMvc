/**
 * Created by dawson.liu on 13-9-9.
 */

var GMK = GMK || {};
GMK.Settlement = GMK.Settlement || {};
GMK.Settlement.EntryRecords = GMK.Settlement.EntryRecords || {};

GMK.Settlement.EntryRecords.start = function (viewRoute) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Warehouse/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key"),
        contractCode: $routeElem.data("contractcode")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Details') {
            var viewModel = new GMK.Settlement.EntryRecords.DetailViewModel(models, route, {
                detailsUrl: route.baseUrl + 'GetEntryRecord',
                contractCode: route.contractCode,
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel);
            });
        } else if (route.action == 'List') {
            if (viewRoute) {
                var viewModel = new GMK.Settlement.EntryRecords.ListViewModel(models, viewRoute, {
                    contractCode: route.contractCode,
                    searchUrl: route.baseUrl + 'ListEntryRecords',
                    deleteUrl: route.baseUrl + 'DeleteEntryRecord',
                    detailsUrl: route.baseUrl + 'GetEntryRecord'
                });
                viewModel.initialize();
                ko.applyBindings(viewModel);
                viewModel.registerQueryFormEvent();
                ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
            }
        }
    });
};

GMK.Settlement.EntryRecords.ListViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.allCustomersWithCorporations = models._AllCustomers.concat(models._AllCorporations);

    self.byPieceCommodityIds = $.map($.grep(models.AllCommodities, function (r) {
        return r.measureType === models.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });
    self.paramToQuery = ko.mapping.fromJS(route.values.query);
    self.paramQueryed = ko.observable();
    self.resultPagination = ko.mapping.fromJS({ TotalCount: 0, PageCount: 1 });
    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.contractCode = ko.observable(options.contractCode);
        vm.receiptsOfDetail = ko.observableArray();
        vm.weightForReceiptsOfDetail = ko.observable();
        vm.pageSummary = {
            Weight: ko.computed(function () {
                var sum = 0;
                $.each(vm.list(), function (i, r) {
                    sum = utils.roundWeight(sum + utils.roundWeight(r.TotalWeight));
                });
                return sum;
            }),
            ActualWeight: ko.computed(function () {
                var sum = 0;
                $.each(vm.list(), function (i, r) {
                    sum = utils.roundWeight(sum + utils.roundWeight(r.ActualWeight));
                });
                return sum;
            })
        };
        vm.searchSummary = ko.observable({});
        vm.fill = function (result) {
            vm.list.removeAll();
            for (var i = 0; i < result.Data.list.length; i++) {
                var item = result.Data.list[i];
                vm.list.push($.extend(result.Data.list[i], {
                    groupedDetails: ko.observableArray(),
                    spotsDetails: ko.observableArray(),
                    receiptsDetails: ko.observableArray(),
                    storageConvertDetails: ko.observableArray(),
                    isShown: ko.observable(false),
                    isStorageConvert: (item.ReceiveType == models.Enums.SpotReceiveType.StorageConvert && item.WhStorageType != models.Enums.InventoryStorageType.Receipt),
                    isSpot: item.WhStorageType == models.Enums.InventoryStorageType.Spot,
                }));
            }
            vm.searchSummary(result.Data.summary);
            _initializeExpandable();
            base._pagination($("#pager"), +vm.resultPagination.PageCount(), +vm.resultPagination.TotalCount(), +vm.paramQueryed().Pagination.CurrentPage, self.changePage, +result.Data.pagination.PageSize);
        };
        vm.showReceipts = function (item, event) {
            vm.receiptsOfDetail(item.DetailsReceipts.WFWarehouseStorages);
            vm.weightForReceiptsOfDetail(item.Weight);
        }
    }
    viewModel.call(this);

    self.changePage = function (newPage, pageSize) {
        var params = self.paramQueryed();
        var currPageSize = +self.paramToQuery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.paramToQuery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        _search(params);
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
    function _search(param) {
        base._get(options.searchUrl, param, function (result) {
            param.Pagination.CurrentPage = result.Data.pagination.CurrentPage;
            self.paramQueryed(param);
            self.resultPagination.TotalCount(result.Data.pagination.TotalCount);
            self.resultPagination.PageCount(result.Data.pagination.PageCount);
            var urlParam = self.paramQueryed();
            utils.cleanEmpty(urlParam);
            history.replaceState(null, null, location.pathname + '?' + $.param(urlParam));
            self.fill(result);
        });
    };

    self.onSearch = function () {
        self.paramToQuery.Pagination.CurrentPage(1);
        var param = ko.mapping.toJS(self.paramToQuery);
        _search(param);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFWarehouseEntryRecordId }, function () {
            var param = ko.mapping.toJS(self.paramToQuery);
            _search(param);
        });
    };
    var bundleUnit = $.grep(models.AllUnits, function (r) {
        return r.code == "Bundle";
    });

    self.loadDetails = function (item) {
        if (!item.loaded) {
            if (item.isSpot && $.inArray(item.CommodityId, self.byPieceCommodityIds) !== -1 && !item.isStorageConvert) {
                base._get('Warehouse/GetGroupedEntryRecordDetails', { id: item.WFWarehouseEntryRecordId }, function (result) {
                    var contractDetails = $.map(result.Data.contracts, function (r) {
                        $.each(r.WFContractDetailInfoes, function (j, d) {
                            d.contract = r;
                        });
                        return r.WFContractDetailInfoes;
                    });
                    $.each(result.Data.groupedDetails, function (i, r) {
                        var cd = utils.find(contractDetails, function (d) {
                            return d.WFContractDetailInfoId === r.WFContractDetailInfoId;
                        });
                        r.ContractCode = cd ? cd.contract.ContractCode : '';
                        r.DetailsText = '';
                        r.WFWarehouseEntryRecordId = item.WFWarehouseEntryRecordId;
                        if (cd) {
                            r.DetailsText = cd ? models.findBrand(cd.BrandId, cd.contract.CommodityId) + "-" + models.findSpecification(cd.SpecificationId, cd.contract.CommodityId) + "-" + (cd.ActualPrice || cd.Price || '') : '';
                        }
                        r.entryRecord = item;
                    });
                    item.groupedDetails(result.Data.groupedDetails);
                    item.isShown(true);
                    item.loaded = true;
                });
            } else {
                base._get(options.detailsUrl, { id: item.WFWarehouseEntryRecordId }, function (result) {
                    $.each(result.record.WFWarehouseEntryRecordDetails, function (i, r) {
                        $.each(r.WFContractEntryRecordDetails, function (j, detail) {
                            if (detail.ObjectType == models.Enums.SendReceiveObjectType.UnPledge)
                                r.WFContractEntryRecordDetails.remove(j);
                        });
                    });

                    $.each(result.record.WFWarehouseEntryRecordDetails, function (r, detail) {
                        detail.Bundles = ""; detail.GrossWeight = "";
                        detail.BundlesMeasureInfoId = null; detail.GrossWeightMeasureInfoId = null;
                        $.each((detail.WFStorageAssistantMeasureInfoes || []), function (i, info) {
                            if (info.SubMeasureType == models.Enums.SubMeasureType.Bundle) {
                                detail.Bundles = info.Quantity;
                                detail.BundlesMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                            }
                            if (info.SubMeasureType == models.Enums.SubMeasureType.GrossWeight) {
                                detail.GrossWeight = info.Quantity;
                                detail.GrossWeightMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                            }
                        });
                    });
                    if (item.isStorageConvert) {
                        item.storageConvertDetails(result.record.WFWarehouseEntryRecordDetails);
                    } else {
                        var contractDetails = $.map(result.record.WFWarehouseEntryRecordDetails, function (r) {
                            $.each(r.WFContractEntryRecordDetails || [], function (i, detail) {
                                detail.PtCardCode = r.CardCode;
                                detail.PtCommodityId = item.CommodityId;
                                detail.PtBrandId = r.BrandId;
                                detail.PtSpecificationId = r.SpecificationId;
                                detail.WFWarehouseEntryRecordId = item.WFWarehouseEntryRecordId;
                                detail.WFWarehouseEntryRecordDetailId = r.WFWarehouseEntryRecordDetailId;
                                detail.Bundles = r.Bundles;
                                detail.GrossWeight = r.GrossWeight;
                                detail.WFStorageAssistantMeasureInfoId = r.WFStorageAssistantMeasureInfoId;
                                detail.ContractCode = '';
                                detail.DetailsText = '';
                            });
                            return r.WFContractEntryRecordDetails || [];
                        });
                        $.each(result.contracts, function (i, item) {
                            for (var i = 0; i < contractDetails.length; i++) {
                                var detail = contractDetails[i];
                                for (var j = 0; j < item.WFContractDetailInfoes.length; j++) {
                                    var info = item.WFContractDetailInfoes[j];
                                    if (detail.WFContractDetailInfoId == info.WFContractDetailInfoId) {
                                        detail.ContractCode = item.ContractCode;
                                        detail.DetailsText = self.findBrand(info.BrandId, item.CommodityId) + "-" + self.findSpecification(info.SpecificationId, item.CommodityId) + "-" + (info.ActualPrice || info.Price || '');
                                        break;
                                    }
                                }
                            }
                        });

                        if (item.isSpot) {
                            $.each(contractDetails, function (i, spot) {
                                $.extend(spot, { detailEditable: item.WholeOutEntryUid == null ? true : false });
                            });
                            item.spotsDetails(contractDetails);
                        } else {
                            item.receiptsDetails(contractDetails);
                        }
                    }
                    if (expandingItem) $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                    expandingItem = null;
                    item.isShown(true);
                    item.loaded = true;
                });
            }
        }
    };

    self.warningMessage = ko.observable('');
    self.isContinueSubmit = ko.observable(false);

    self.onSuccess = function () {
       // alertify.alert('操作成功').show();
        $('#confirmFinishEntryModal').modal('hide');
    };

    self.setEntryRecordStatus = function (viewModel, callback) {
        base._post('Warehouse/SetEntryRecordStatusById', { id: self.selectedViewModel().WFWarehouseEntryRecordId }, function (result) {
            self.onSuccess();
        });
    }

    self.selectedViewModel = ko.observable();

    self.onInlineEditorSave = function (url, viewModel, newVal, callback, source, allBindings) {        
        if (url.indexOf('SaveContractEntryRecordDetailActualWeight') >= 0) {
            if (isNaN(newVal)) {
                alert('请输入合法的数字');
                return false;
            }
            var param = {                
                contractEntryRecordDetailId: viewModel.WFContractEntryRecordDetailId,
                contractEntryRecordDetailActualWeight: newVal
            };
            base._post(url, param, function (result) {
                var offset = utils.parseFloat(newVal) - utils.parseFloat(viewModel.ActualWeight);
                viewModel.ActualWeight = newVal;
                if (allBindings) allBindings.text = newVal;
                var $source = $(source);
                $source.text(utils.formatDecimal(viewModel.ActualWeight, self.settings.weightDigits));
                var index = $("#tableQueryResult>thead th:contains('结算重量')").eq(0).index();
                var td = $($source.closest('table').closest('tr').prev().children('td')[index]);
                td.text(utils.formatDecimal(accounting.parse(td.text()) + offset, self.settings.weightDigits));
                self.warningMessage(result.Message || '');
                if (result.Message) {
                    self.isContinueSubmit(false);
                    self.selectedViewModel(viewModel);
                    $('#confirmFinishEntryModal').modal('show');
                }

                if (callback) {
                    callback();
                }
            });
        } else if (url.indexOf('SaveEntryRecordCardCode') >= 0) {
            var param = {
                warehouseEntryRecordId: viewModel.WFWarehouseEntryRecordId,
                warehouseEntryRecordDetailId: viewModel.WFWarehouseEntryRecordDetailId,
                newCardCode: newVal
            };
            base._post(url, param, function () {
                viewModel.CardCode = newVal;
                if (allBindings) allBindings.text = newVal;
                var $source = $(source);
                $source.text(viewModel.CardCode);
                callback();
            });
        } else if (url.indexOf('SaveEntryRecordGroupedCardCode')) {
            var param = {
                warehouseEntryRecordId: viewModel.WFWarehouseEntryRecordId,
                oldCardCode: viewModel.CardCode,
                warehouseEntryRecordDetailId: viewModel.WFWarehouseEntryRecordDetailId,
                brandId: viewModel.PtBrandId,
                newCardCode: newVal
            };
            base._post(url, param, function (result) {
                viewModel.CardCode = newVal;
                if (allBindings) allBindings.text = newVal;
                var $source = $(source);
                $source.text(viewModel.CardCode);
                callback();
                viewModel.entryRecord.loaded = false;
                self.loadDetails(viewModel.entryRecord);
            });
        }
    };
    self.initialize = function () {

        if ($.inArray(self.paramToQuery.CommodityId(), $.map(models.UserCommodities, function (r) { return r.id; })) === -1) {
            self.paramToQuery.CommodityId((models.UserCommodities[0] || {}).id);
        }
        var param = ko.mapping.toJS(self.paramToQuery);

        _search(param);
    };
}

GMK.Settlement.EntryRecords.DetailViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.byPieceCommodityIds = $.map($.grep(models.AllCommodities, function (r) {
        return r.measureType === models.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });

    self.item = {};

    var bundleUnit = $.grep(models.AllUnits, function (r) {
        return r.code == "Bundle";
    });

    self.initialize = function (callback) {
        base._get(options.detailsUrl, { id: route.key }, function (result) {
            $.each(result.record.WFWarehouseEntryRecordDetails, function (i, r) {
                $.each(r.WFContractEntryRecordDetails, function (j, detail) {
                    if (detail.ObjectType == models.Enums.SendReceiveObjectType.UnPledge)
                        r.WFContractEntryRecordDetails.remove(j);
                });
            });

            self.item = $.extend(result.record, {
                groupedDetails: ko.observableArray(),
                spotsDetails: ko.observableArray(),
                receiptsDetails: ko.observableArray(),
                storageConvertDetails: ko.observableArray(),
                isShown: ko.observable(false),
                isStorageConvert: (result.record.ReceiveType == models.Enums.SpotReceiveType.StorageConvert && result.record.WhStorageType != models.Enums.InventoryStorageType.Receipt),
                isSpot: result.record.WhStorageType == models.Enums.InventoryStorageType.Spot,
                isByPiece: $.inArray(result.record.CommodityId, self.byPieceCommodityIds) !== -1,
            });

            self.groupedDetailsSummary = {
                weight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.groupedDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.Weight));
                    });
                    return sum;
                }),
                actualWeight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.groupedDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.ActualWeight));
                    });
                    return sum;
                })
            };
            self.spotsDetailsSummary = {
                weight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.spotsDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.Weight));
                    });
                    return sum;
                }),
                actualWeight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.spotsDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.ActualWeight));
                    });
                    return sum;
                })
            };
            self.receiptsDetailsSummary = {
                weight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.receiptsDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.Weight));
                    });
                    return sum;
                }),
                actualWeight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.receiptsDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.ActualWeight));
                    });
                    return sum;
                })
            };
            self.storageConvertDetailsSummary = {
                weight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.storageConvertDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.Weight));
                    });
                    return sum;
                }),
                actualWeight: ko.computed(function () {
                    var sum = 0;
                    $.each(self.item.storageConvertDetails(), function (i, r) {
                        sum = utils.roundWeight(sum + utils.roundWeight(r.ActualWeight));
                    });
                    return sum;
                })
            };
            $.each(result.record.WFWarehouseEntryRecordDetails, function (r, detail) {
                detail.Bundles = ""; detail.GrossWeight = "";
                detail.BundlesMeasureInfoId = null; detail.GrossWeightMeasureInfoId = null;
                $.each((detail.WFStorageAssistantMeasureInfoes || []), function (i, info) {
                    if (info.SubMeasureType == models.Enums.SubMeasureType.Bundle) {
                        detail.Bundles = info.Quantity;
                        detail.BundlesMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                    }
                    if (info.SubMeasureType == models.Enums.SubMeasureType.GrossWeight) {
                        detail.GrossWeight = info.Quantity;
                        detail.GrossWeightMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                    }
                });
            });

            if (self.item.isSpot && $.inArray(self.item.CommodityId, self.byPieceCommodityIds) !== -1 && !self.item.isStorageConvert) {
                base._get('Warehouse/GetGroupedEntryRecordDetails', { id: route.key }, function (result) {
                    var contractDetails = $.map(result.Data.contracts, function (r) {
                        $.each(r.WFContractDetailInfoes, function (j, d) {
                            d.contract = r;
                        });
                        return r.WFContractDetailInfoes;
                    });
                    $.each(result.Data.groupedDetails, function (i, r) {
                        var cd = utils.find(contractDetails, function (d) {
                            return d.WFContractDetailInfoId === r.WFContractDetailInfoId;
                        });
                        r.ContractCode = cd ? cd.contract.ContractCode : '';
                        r.DetailsText = '';
                        r.WFWarehouseEntryRecordId = self.item.WFWarehouseEntryRecordId;
                        if (cd) {
                            r.WFWarehouseEntryRecordDetailId = cd.WFWarehouseEntryRecordDetailId;
                            r.DetailsText = cd ? models.findBrand(cd.BrandId, cd.contract.CommodityId) + "-" + models.findSpecification(cd.SpecificationId, cd.contract.CommodityId) + "-" + (cd.ActualPrice || cd.Price || '') : '';
                        }
                        if (!r.WFWarehouseEntryRecordId) {
                            r.WFWarehouseEntryRecordId = self.item.WFWarehouseEntryRecordId;
                        }
                        r.entryRecord = self.item;
                    });
                    self.item.groupedDetails(result.Data.groupedDetails);

                    if (callback)
                        callback();
                });
            } else {
                if (self.item.isStorageConvert) {
                    self.item.storageConvertDetails(result.record.WFWarehouseEntryRecordDetails);
                } else {
                    var contractDetails = $.map(result.record.WFWarehouseEntryRecordDetails, function (r) {
                        $.each(r.WFContractEntryRecordDetails || [], function (i, detail) {                         
                            detail.PtCardCode = r.CardCode;
                            detail.PtCommodityId = self.item.CommodityId;
                            detail.PtBrandId = r.BrandId;
                            detail.PtSpecificationId = r.SpecificationId;
                            detail.WFWarehouseEntryRecordId = self.item.WFWarehouseEntryRecordId;
                            detail.WFWarehouseEntryRecordDetailId = r.WFWarehouseEntryRecordDetailId;
                            detail.Bundles = r.Bundles;
                            detail.GrossWeight = r.GrossWeight;
                            detail.ContractCode = "";
                            detail.DetailsText = "";
                        });
                        return r.WFContractEntryRecordDetails || [];
                    });
                    $.each(result.contracts, function (i, item) {
                        for (var i = 0; i < contractDetails.length; i++) {
                            var detail = contractDetails[i];
                            for (var j = 0; j < item.WFContractDetailInfoes.length; j++) {
                                var info = item.WFContractDetailInfoes[j];
                                if (detail.WFContractDetailInfoId == info.WFContractDetailInfoId) {
                                    detail.ContractCode = item.ContractCode;
                                    detail.DetailsText = self.findBrand(info.BrandId, item.CommodityId) + "-" + self.findSpecification(info.SpecificationId, item.CommodityId) + "-" + (info.ActualPrice || info.Price || '');
                                    break;
                                }
                            }
                        }
                    });

                    if (self.item.isSpot) {
                        $.each(contractDetails, function (i, spot) {
                            $.extend(spot, { detailEditable: result.record.WholeOutEntryUid == null ? true : false });
                        });
                        self.item.spotsDetails(contractDetails);
                    } else {
                        self.item.receiptsDetails(contractDetails);
                    }
                }
                if (callback)
                    callback();
            }
        });
    };
}

