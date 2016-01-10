/**
 * Created by dawson.liu on 13-9-12.
 */

var GMK = GMK || {};
GMK.Settlement = GMK.Settlement || {};
GMK.Settlement.OutRecords = GMK.Settlement.OutRecords || {};

GMK.Settlement.OutRecords.start = function (data) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Warehouse/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key"),
        contractId: $routeElem.data("contractid"),
        spotReceiptConvertInfoId: $routeElem.data("spotreceiptconvertinfoid")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        //if (route.action == 'Manage') {
        //    var viewModel = new GMK.Settlement.OutRecords.ManageWizardViewModel(models, {
        //        action: route.action,
        //        loadContractUrl: route.baseUrl + 'GetContract',
        //        contractId: route.contractId,
        //        spotReceiptConvertInfoId: route.spotReceiptConvertInfoId,
        //        loadUrl: route.baseUrl + 'GetOutRecordDetails',
        //        loadKey: route.key || '',
        //        searchContractsUrl: route.baseUrl + 'ListContracts',
        //        searchSpotReceiptConvertInfoUrl: route.baseUrl + '',
        //        searchSpotsUrl: route.baseUrl + 'ListSpots',
        //        searchReceiptsUrl: route.baseUrl + 'ListReceipts',
        //        saveUrl: route.baseUrl + 'SaveOutRecord',
        //        listUrl: route.baseUrl + 'OutRecords',
        //        listContractDetailsByCardCodeUrl: route.baseUrl + 'ListContractDetailsByCardCode',
        //        generateDeliveryOrderCodeUrl: route.baseUrl + 'GenerateDeliveryOrderCode',
        //        setOutRecordStatusByIdUrl: route.baseUrl + 'SetOutRecordStatusById',
        //        validateOutRecordUrl: route.baseUrl + 'ValidateOutRecord',
        //        searchMakeRecordsUrl: 'Storage/ListMakeRecords',
        //        listContactsUrl: 'Contact/ListContactRecordsSimple',
        //        requestCreateUrl: data.requestCreateUrl,
        //        makeRecordsUrl: data.makeRecordsUrl
        //    }), currentContractCode = null;
        //    window.vm = viewModel;
        //    viewModel.initialize(function (data) {
        //        if (data.record.SendType == models.Enums.SpotSendType.ForContract && data.association.length == 1 && data.association[0].WFContractDetailInfoes.length == 1) currentContractCode = data.association[0].ContractCode;
        //    });
        //    function _handleBasicSetting() {
        //        if (!viewModel.basicSettings.isValid()) return false;
        //        viewModel.basicSettings.notifySubscribers(true);
        //        viewModel.basicSettings.disabled(true);
        //        viewModel.basicSettings.disabled1(viewModel.basicSettings.consignmentType() != viewModel.commonModels.Enums.SpotSendType.General);
        //        viewModel.basicSettings.queriedCommodity((function computedCommodity() {
        //            if ((viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.General) ||
        //                (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.TransferWarehouse)) {
        //                return viewModel.basicSettings.selectedCommodity();
        //            } else if (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.ForContract) {
        //                if (viewModel.basicSettings.selectedContracts() && viewModel.basicSettings.selectedContracts().length) {
        //                    return viewModel.basicSettings.selectedContracts()[0].CommodityId;
        //                } else {
        //                    return '';
        //                }
        //            }
        //        })());
        //        if (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.ForContract) {
        //            if (viewModel.basicSettings.selectedContracts().length == 1 && viewModel.basicSettings.selectedContracts()[0].WFContractDetailInfoes.length == 1) {
        //                var contract = viewModel.basicSettings.selectedContracts()[0], contractDetail = contract.WFContractDetailInfoes[0];
        //                if (currentContractCode != contract.ContractCode) {
        //                    //alert('所有选择的{0}都将被自动关联至合同 {5} 的唯一明细：{1}-{2}-{3}-{4}'.format(viewModel.basicSettings.isSpot() ? '现货' : '仓单',
        //                    //    viewModel.commonModels.findBrand(contractDetail.BrandId, contract.CommodityId),
        //                    //    viewModel.commonModels.findSpecification(contractDetail.SpecificationId, contract.CommodityId),
        //                    //    contractDetail.Weight, contractDetail.Price, contract.ContractCode));
        //                    $('#OutRecordWizard').bootstrapWizard('hide', 2);
        //                    $('#OutRecordWizard .nav li:has([data-toggle="tab"]):eq(2) > a').attr('data-toggle', '');
        //                    currentContractCode = contract.ContractCode;
        //                }
        //            } else {
        //                $('#OutRecordWizard .nav li:has([data-toggle!="tab"]) > a').attr('data-toggle', 'tab');
        //                $('#OutRecordWizard').bootstrapWizard('display', 2);
        //            }
        //        }
        //        return true;
        //    }
        //    function _handleAdvancedSetting() {
        //        if (!viewModel.outRecordViewModel.isValid()) return false;
        //        viewModel.outRecordViewModel.notifySubscribers(true);
        //        return true;
        //    }
        //    $('#OutRecordWizard').bootstrapWizard({
        //        tabClass: 'nav',
        //        onNext: function ($activeTab, $navigation, nextIndex) {
        //            var currentHref = $($activeTab.children('a')[0]).attr('href');
        //            switch (currentHref) {
        //                case '#BasicSettingsStep':
        //                    if (!_handleBasicSetting()) return false;
        //                    break;
        //                case '#AdvancedSettingsStep':
        //                    if (!_handleAdvancedSetting()) return false;
        //                    break;
        //            }

        //            var isLast = $(this.nextSelector).hasClass('finish');
        //            if (isLast) viewModel.saveOutRecord();
        //            return !isLast;
        //        },
        //        onTabClick: function ($activeTab, $navigation, currentIndex, clickedIndex) {
        //            if (clickedIndex == currentIndex) return false;
        //            switch (currentIndex) {
        //                case 0:
        //                    return _handleBasicSetting();
        //                case 1:
        //                    return _handleAdvancedSetting();
        //            }
        //        },
        //        onFixNavigationButton: function (opts) {
        //            if (opts.isLast) $('.btn-actions').addClass('in');
        //            else $('.btn-actions').removeClass('in');
        //        }
        //    });
        //    ko.applyBindings(viewModel);
        //    viewModel.commonModels.registerQueryFormEvent();
        //} else
        if (route.action === 'Details') {
            var viewModel = new GMK.Settlement.OutRecords.DetailViewModel(models, {
                action: route.action,
                loadUrl: route.baseUrl + 'GetOutRecordDetails',
                loadKey: route.key || ''
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel);
            });
        } else if (route.action === 'List') {
            var viewModel = new GMK.Settlement.OutRecords.ListViewModel(models, {
                contractCode: route.contractCode,
                searchUrl: route.baseUrl + 'ListOutRecords',
                deleteUrl: route.baseUrl + 'DeleteOutRecord',
                detailsUrl: route.baseUrl + 'GetOutRecord',
                setOutRecordStatusByIdUrl: route.baseUrl + 'SetOutRecordStatusById',
                getDeliveryBillPrintableUrl: route.baseUrl + 'IsDeliveryBillPrintable'
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
            function initialize(query) {
                if (!query.CommodityId) query.CommodityId = $('select[name="CommodityId"]').val();
                utils.deserialize('#searchForm .gmk-data-field', query);
                viewModel.initialize(query);
            }
            initialize(models.getQuery());
            models.registerStateChange(initialize);
        }
    });
};

GMK.Settlement.OutRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    var pagination;
    var ns = GMK.Settlement.OutRecords;
    self.RemarkNote = ko.observable();
    function viewModel() {
        var vm = this;
        vm.sendType = ko.observable();
        vm.allCustomersWithCorporations = models._AllCustomers.concat(models._AllCorporations);
        vm.sendType.subscribe(function (newVal) {
            if (newVal && newVal != models.Enums.SpotSendType.ForContract) $('#ContractCode').val('');
            if (newVal != models.Enums.SpotSendType.MakeReceipt) $('#SpotReceiptConvertCode').val('');
            if (newVal != models.Enums.SpotSendType.StorageConvert) $('#StorageConvertCode').val('');
        });
        vm.list = ko.observableArray();
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
            for (var i = 0, list = result.Data.list; i < list.length; i++) {
                vm.list.push($.extend(list[i], {
                    approvalStatus: ko.observable(list[i].ApprovalStatus),
                    spotsDetails: ko.observableArray(),
                    receiptsDetails: ko.observableArray(),
                    isShown: ko.observable(false),
                    weightMemoDetails: ko.observableArray(),
                    storageConvertDetails : ko.observableArray([]),
                    isStorageConvert: (list[i].SendType == models.Enums.SpotSendType.StorageConvert && list[i].WhStorageType != models.Enums.InventoryStorageType.Receipt),
                }));
            }
            vm.searchSummary(result.Data.summary);
            pagination = result.Data.pagination;
            _initializeExpandable();
            base._p(result.Data.pagination, options.searchUrl, vm.fill);
        };
    }
    viewModel.call(this);

    self.onSearch = function () {
        _search();
    };

    function _search(withPagination) {
        var param = utils.serialize("#searchForm .gmk-data-field");
        if (withPagination) param.pagination = pagination;
        base._get(options.searchUrl, param, function (data) {
            self.fill(data);
        }, true);
    }

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFWarehouseOutRecordId }, function () {
            _search(true);
        });
    };

    self.onExportExcelDeliveryBill = function (item) {
        _exportDoc(item, false);
    };
    self.onExportDeliveryBill = function (item) {
        var isWord = null;
        if ((ns.corporationFullName != ns.yangguFullName) && ((item.approvalStatus() === null) || (item.approvalStatus() === models.Enums.ApprovalStatus.None))) isWord = false;
        _exportDoc(item, isWord);
    };
    self.onExportWordDeliveryBill = function (item) {
        _exportDoc(item, true);
    };

    function _exportDoc(item, isWord) {
        var result = base._get(options.getDeliveryBillPrintableUrl, $.param({ wFWarehouseOutRecordId: item.WFWarehouseOutRecordId, isWord: isWord, downloadToken: true }), function (data) {
            if (data.Status) {
                utils.fileDownload(utils.urlAction('DeliveryBill', 'Warehouse', { wFWarehouseOutRecordId: item.WFWarehouseOutRecordId, isWord: isWord }));
                //utils.downloadFile(function ($form, downloadToken) {                    
                //    var url = utils.urlAction('DeliveryBill', 'Warehouse', { wFWarehouseOutRecordId: item.WFWarehouseOutRecordId, isWord: isWord, downloadToken: downloadToken });
                //    $form.attr('action', url);
                //});
            }
        }, true);
    };

    self.toCancelFlow = function (item) {
        self.currItem = item;
        self.RemarkNote('');
    };

    self.onCancelFlow = function (modal) {
        return function () {
            confirm('确定要撤销？', function () {
                base._post('WorkflowMessage/RequestCancelByObject', {
                    objectId: self.currItem.WFWarehouseOutRecordId,
                    flowType: models.Enums.ApprovalType.DeliveryBill,
                    note: self.RemarkNote()
                }, function (result) {
                    self.currItem.approvalStatus(models.Enums.ApprovalStatus.Cancelled);
                    $(modal).modal('hide');
                });
            }
            );
        }
    };

    var downloadURL = function downloadURL(url) {
        $('#page-spinner').show();
        var hiddenIFrameID = 'hiddenDownloader',
            iframe = document.getElementById(hiddenIFrameID);
        if (iframe === null) {
            iframe = document.createElement('iframe');
            iframe.id = hiddenIFrameID;
            iframe.style.display = 'none';
            iframe.onload = function () {
                var s = iframe.src;
                $('#page-spinner').hide();
                //if ($('#page-spinner').is(':visible')) {
                //    $('#page-spinner').hide();
                //    $('#hiddenDownloader').remove();
                //}
            };
            document.body.appendChild(iframe);
        }
        iframe.src = url;
    };

    self.findCommodityObj = function (id) {
        var list = $.grep(self.UserCommodities, function (elem) { return elem.id == id; });
        if (list.length > 0) return list[0];
        return null;
    };

    self.onShowDetail = function (item) {
        if (!item.loaded) {
            item.loaded = true;
            var currentCommodity = self.findCommodityObj(item.CommodityId);
            base._get(options.detailsUrl, { id: item.WFWarehouseOutRecordId }, function (data) {
                if (true || !item.IsSpot || currentCommodity.measureType == 2) {
                    if (data.contracts && data.contracts.length) {
                        $.each(data.record.WFWarehouseOutRecordDetails, function (i1, word) {
                            $.each(word.WFContractOutRecordDetails, function (i2, cord) {
                                cord.ContractCode = '';
                                cord.DetailsText = '';
                                $.each(data.contracts, function (i3, c) {
                                    $.each(c.WFContractDetailInfoes, function (i4, cd) {
                                        if (cord.ObjectId === cd.WFContractDetailInfoId) {
                                            cord.ContractCode = c.ContractCode;
                                            cord.DetailsText = self.findBrand(cd.BrandId) + "-" + self.findSpecification(cd.SpecificationId) + '-' + cd.Weight + "-" + (cd.ActualPrice || cd.Price || '');
                                        }
                                    });
                                });
                            });
                        });
                        //$.each(data.contracts, function (i, item) {
                        //    for (var k = 0; k < data.record.WFWarehouseOutRecordDetails.length; k++) {
                        //        var warehouseOutDetail = data.record.WFWarehouseOutRecordDetails[k];
                        //        for (var i = 0; i < warehouseOutDetail.WFContractOutRecordDetails.length; i++) {
                        //            var detail = warehouseOutDetail.WFContractOutRecordDetails[i];
                        //            detail.ContractCode = '';
                        //            detail.DetailsText = '';
                        //            for (var j = 0; j < item.WFContractDetailInfoes.length; j++) {
                        //                var info = item.WFContractDetailInfoes[j];
                        //                if (detail.WFContractDetailInfoId == info.WFContractDetailInfoId) {
                        //                    detail.ContractCode = item.ContractCode;
                        //                    detail.DetailsText = self.findBrand(info.BrandId, item.CommodityId) + "-" + self.findSpecification(info.SpecificationId, item.CommodityId) + '-' + info.Weight + "-" + (info.ActualPrice || info.Price || '');
                        //                    break;
                        //                }
                        //            }
                        //        }
                        //    }
                        //});
                    } else {
                        $.each(data.record.WFWarehouseOutRecordDetails, function (index, term) {
                            $.each(term.WFContractOutRecordDetails, function (j, contractOutDetail) {
                                contractOutDetail.ContractCode = '';
                                contractOutDetail.DetailsText = '';
                            });
                        });
                    }
                    var contractOutDetails = $.map(data.record.WFWarehouseOutRecordDetails, function (r) {
                        $.each(r.WFContractOutRecordDetails || [], function (i, detail) {
                            detail.WFWarehouseStorage = r.WFWarehouseStorage;
                            detail.BrandId = r.BrandId;
                            detail.SpecificationId = r.SpecificationId;
                            detail.UnitId = r.UnitId;
                            detail.CommodityId = r.CommodityId;
                            detail.CardCode = r.CardCode;
                            detail.DeliveryBundles = r.DeliveryBundles;
                            detail.WFWarehouseOutRecordId = r.WFWarehouseOutRecordId;
                            detail.WFWarehouseOutRecordDetailId = r.WFWarehouseOutRecordDetailId;
                        });
                        return r.WFContractOutRecordDetails || [];
                    });

                    if (item.isStorageConvert) {
                        item.storageConvertDetails(contractOutDetails);
                    } else {
                        if (item.IsSpot) {
                            item.spotsDetails(contractOutDetails); //记重
                        }
                        else {
                            item.receiptsDetails(contractOutDetails);
                        }
                    }
                } else {
                    item.weightMemoDetails(data.record);
                }
                if (expandingItem) $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
                item.isShown(true);
            });
        }
    };

    self.warningMessage = ko.observable('');
    self.isContinueSubmit = ko.observable(false);

    self.onSuccess = function () {
        $('#confirmFinishOutModal').modal('hide');
    };

    self.setOutRecordStatus = function () {
        base._post(options.setOutRecordStatusByIdUrl, { id: self.selectedViewModel().WFWarehouseOutRecordId }, function (result) {
            self.onSuccess();
        });
    }

    self.selectedViewModel = ko.observable();

    self.onInlineEditorSave = function (url, viewModel, newVal, callback, source, allBindings) {
        if (isNaN(newVal)) {
            alert('请输入合法的数字');
            return false;
        }
        var param = {
            contractOutRecordDetailId: viewModel.WFContractOutRecordDetailId,
            contractOutRecordDetailActualWeight: newVal,
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
                $('#confirmFinishOutModal').modal('show');
            }

            if (callback) {
                callback();
            }
        });
    }
    var expandingItem, $divQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.onShowDetail(self.list()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }

    self.initialize = function (query) {
        base._get(options.searchUrl, query, function (data) {
            self.fill(data);
        }, true);
    }
}

GMK.Settlement.OutRecords.DetailViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;

        vm.selectedUnit = ko.observable();
        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    vm.measureType(commodity.measureType);
                    vm.brands(commodity.brands);
                    vm.specifications(commodity.specifications);
                    vm.selectedUnit(commodity.unitId);
                }
            }
        });
        vm.outType = ko.observable();

        vm.isSpot = ko.observable(true);
        vm.measureType = ko.observable(vm.Enums.CommodityMeasureType.ByWeight);
        vm.deliveryOrderCode = ko.observable('');
        vm.contractList = ko.observableArray();
        vm.selectedContracts = ko.observableArray();
        vm.contractDetailsForContract = ko.observableArray();
        vm.selectedContractDetail = ko.observable();

        vm.spotOutDetails = ko.observableArray();
        vm.spotOutTotalWeight = ko.computed(function () {
            var sum = 0;
            $.each(vm.spotOutDetails(), function (i, n) {
                sum = utils.roundAmount(sum + utils.roundAmount(n.Weight, 4), 4);
            });
            return sum;
        });

        vm.receiptOutDetails = ko.observableArray();
        vm.receiptOutTotalWeight = ko.computed(function () {
            var sum = 0;
            $.each(vm.receiptOutDetails(), function (i, n) {
                sum = utils.roundAmount(sum + utils.roundAmount(n.Weight, 4), 4);
            });
            return sum;
        });

        vm.receiptList = ko.observableArray();
        vm.selectedReceipts = ko.observableArray();
        vm.spotList = ko.observableArray();
        vm.selectedSpots = ko.observableArray();
        vm.totalWeightForSelectedReceipts = ko.observable(0);
        vm.totalWeightForSelectedSpots = ko.computed(function () {
            var total = 0, isWeight = vm.measureType() == vm.Enums.CommodityMeasureType.ByWeight;
            $.each(vm.selectedSpots(), function (i, s) {
                var fixedWeight;
                if (isWeight) {
                    fixedWeight = Number(s.Weight() || '0');
                    if (isNaN(fixedWeight)) {
                        fixedWeight = 0;
                        vm.canUserSave(false);
                    }
                } else {
                    fixedWeight = utils.parseFloat(s.TotalAailableWeight());
                }
                total += fixedWeight;
            })
            return utils.round(total, 4);
        });
        vm.receiptsOfDetail = ko.observableArray();
        vm.weightForReceiptsOfDetail = ko.observable();
        vm.selectedWarehouse = ko.observable();
        vm.selectedCustomer = ko.observable();

        vm.fill = function (data) {
            vm.record = data.record;
            utils.deserialize("#mainForm .gmk-data-field", data.record);
            $.each(data.record.WFWarehouseOutRecordDetails, function (i2, word) {
                $.each(word.WFContractOutRecordDetails, function (i3, cord) {
                    $.each(data.association || [], function (i0, c) {
                        $.each(c.WFContractDetailInfoes || [], function (i1, cd) {

                            if (cord.ObjectType === models.Enums.SendReceiveObjectType.ContractDetail && cord.ObjectId === cd.WFContractDetailInfoId) {
                                cord.ContractCode = c.ContractCode;
                                cord.DetailsText = self.findBrand(cd.BrandId) + "-" + self.findSpecification(cd.SpecificationId) + "-" + cd.Weight + "-" + ((cd.ActualPrice == null || cd.ActualPrice == 0) ? cd.Price : cd.ActualPrice);
                                cord.contract = c;

                            }

                        });
                    });
                })
            });
            //$.each(data.association || [], function (i, item) {
            //    for (var i = 0; i < data.record.WFContractOutRecordDetails.length; i++) {
            //        var detail = data.record.WFContractOutRecordDetails[i];
            //        if (!item.WFContractDetailInfoes) continue;
            //        for (var j = 0; j < item.WFContractDetailInfoes.length; j++) {
            //            var info = item.WFContractDetailInfoes[j];
            //            if (detail.WFContractDetailInfoId == info.WFContractDetailInfoId) {
            //                detail.ContractCode = item.ContractCode;
            //                detail.DetailsText = self.findBrand(info.BrandId, item.CommodityId) + "-" + self.findSpecification(info.SpecificationId, item.CommodityId) + "-" + info.Weight + "-" + (info.ActualPrice == null || info.ActualPrice == 0) ? info.Price : info.ActualPrice;
            //                detail.contract = item;
            //                break;
            //            }
            //        }
            //    }
            //});
            vm.deliveryOrderCode(data.record.DeliveryOrderCode);
            if (data.record.WhStorageType !== models.Enums.InventoryStorageType.Receipt) {
                vm.measureType($.grep(vm.UserCommodities, function (elem) { return elem.id == data.record.CommodityId; })[0].measureType);
                $.each(data.record.WFWarehouseOutRecordDetails, function (i1, word) {
                    $.each(word.WFContractOutRecordDetails, function (i, item) {
                        var spot;
                        if (vm.measureType() == vm.Enums.CommodityMeasureType.ByWeight) {
                            spot = {
                                WFWarehouseStorageId: word.WFWarehouseStorageId,
                                CardCode: ko.observable(word.WFWarehouseStorage.CardCode),
                                CommodityId: word.WFWarehouseStorage.CommodityId,
                                BrandId: ko.observable(word.WFWarehouseStorage.BrandId),
                                SpecificationId: ko.observable(word.WFWarehouseStorage.SpecificationId),
                                Weight: ko.observable(item.Weight),
                                ActualWeight: ko.observable(item.ActualWeight)
                            };
                            item = $.extend(item, spot);
                            item.Note = ko.observable(item.Note);
                        } else {
                            spot = {
                                WFWarehouseStorageId: word.WFWarehouseStorageId,
                                CardCode: word.WFWarehouseStorage.CardCode,
                                WeightMemoCode: word.WFWarehouseStorage.WeightMemoCode,
                                CustomerId: word.WFWarehouseStorage.CustomerId,
                                EntryTime: word.WFWarehouseStorage.EntryTime,
                                CommodityId: word.WFWarehouseStorage.CommodityId,
                                BrandId: word.WFWarehouseStorage.BrandId,
                                SpecificationId: word.WFWarehouseStorage.SpecificationId,
                                TotalAailableWeight: ko.observable(item.Weight),
                                isSelected: ko.observable(false),
                                ContractDetails: null
                            };
                            spot.isSelected.subscribe(function (newVal) {
                                onSelectedChanged(newVal, spot);
                            });
                            item.CardCode = ko.observable(word.WFWarehouseStorage.CardCode);
                            item.CommodityId = word.WFWarehouseStorage.CommodityId;
                            item.BrandId = ko.observable(word.WFWarehouseStorage.BrandId);
                            item.SpecificationId = ko.observable(word.WFWarehouseStorage.SpecificationId);
                            item.Weight = ko.observable(item.Weight);
                            item.ActualWeight = ko.observable(item.ActualWeight);
                            item.Note = ko.observable(item.Note);
                        }
                        item.Spot = spot;
                    });
                });

                vm.spotOutDetails(data.record.WFWarehouseOutRecordDetails);
            } else {
                vm.isSpot(false);
                $.each(data.record.WFWarehouseOutRecordDetails, function (i, word) {
                    $.each(word.WFContractOutRecordDetails, function (i, item) {
                        var receipt = {
                            WFWarehouseStorageId: word.WFWarehouseStorage.WFWarehouseStorageId,
                            CardCode: word.WFWarehouseStorage.CardCode,
                            CommodityId: word.WFWarehouseStorage.CommodityId,
                            BrandId: word.WFWarehouseStorage.BrandId,
                            SpecificationId: word.WFWarehouseStorage.SpecificationId
                        };
                        item = $.extend(item, receipt);

                        receipt = $.extend(receipt, { isSelected: ko.observable(false), Weight: item.Weight });
                        receipt.isSelected.subscribe(function (val) { onItemSelected(val, receipt, false); });
                        item.Receipt = receipt;
                    });
                });

                vm.receiptOutDetails(data.record.WFWarehouseOutRecordDetails);
            }
            vm.selectedCommodity(data.record.CommodityId);
            vm.selectedCustomer(data.record.CustomerId);
            vm.selectedWarehouse(data.record.WarehouseId);
        };

        vm.fileSpotList = function (data) {
            $('.weight-picker').val('');
            vm.selectedSpots.removeAll();
            vm.spotList.removeAll();
            $.each(data, function (i, item) {
                item.IsSaleOut = ko.observable(false);
                item.TotalAailableWeight = ko.observable(item.TotalAailableWeight);
                $.each(item.ContractDetails, function (i, d) {
                    d.Parent = item;
                    d.Weight = ko.observable();
                    d.Aailable = ko.observable(d.AailableWeight.toFixed(4));
                    d.Weight.subscribe(function (val) {
                        onWeightChanged(val, d);
                    });
                });
                item.isSelected = ko.observable(false);
                item.isSelected.subscribe(function (newVal) {
                    onSelectedChanged(newVal, item);
                });
                vm.spotList.push(item);
            });
        };
        vm.fileReceiptList = function (data) {
            vm.receiptList.removeAll(vm.selectedReceipts());
            vm.selectedReceipts.removeAll();
            vm.totalWeightForSelectedReceipts(0);
            vm.receiptList.removeAll();
            $.each(data, function (i, item) {
                var included = false, details = $.map(vm.receiptOutDetails(), function (word) {
                    return word.WFContractOutRecordDetails;
                });
                for (var i = 0; i < details.length; i++) {
                    if (details[i].Receipt.WFWarehouseStorageId == item.WFWarehouseStorageId) {
                        included = true;
                        break;
                    }
                }
                if (!included) {
                    item.isSelected = ko.observable(false);
                    item.isSelected.subscribe(function (val) { onItemSelected(val, item, false); });
                    vm.receiptList.push(item);
                }
            });
        };
    }
    viewModel.call(this);

    self.initialize = function (callback) {
        base._get(options.loadUrl, { id: options.loadKey }, function (record) {
            self.fill(record);
            if (callback) {
                callback();
            }
        }, true);
    };
}

