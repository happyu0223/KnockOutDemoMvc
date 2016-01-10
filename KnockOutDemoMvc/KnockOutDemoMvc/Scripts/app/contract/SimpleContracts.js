/**
 * Created by dawson.liu on 13-9-6.
 */
"use strict";
var ns = utils.namespace('GMK.Contract.SimpleContracts');

ns.start = function (data) {
    var $route = $("#gmk-route");
    var route = {
        baseUrl: 'Contract/',
        action: $route.data("action"),
        key: $route.data("key"),
        isCopied: !!$route.data("iscopied"),
        newDetail: $route.data("newdetail"),
        newDeliveryContract: $route.data("new-delivery-contract"),
        corporationId: $route.data("corporationid"),
        listUrl: $route.data("listurl"),
        isDeliver: $route.data("is-deliver") === 'True',
        isPledge: $route.data("is-pledge") === 'True',
        isConnectedTranslation: $route.data("is-connectedtranslation"),
        connectedContract: $route.data("new-connected-contract")
    };

    GMK.Features.CommonModels.onReady(function (models) {
        function initialize(viewModel, query) {
            var contractType = models.Enums.ContractType.NormalContract;
            if (route.isDeliver) contractType = models.Enums.ContractType.Delivery;
            else if (route.isPledge) contractType = models.Enums.ContractType.PledgeContract;
            query = $.extend({}, query, {
                ContractType: contractType
            });
            utils.deserialize('#searchForm .gmk-data-field', query);
            viewModel.initialize(query);
        }
        if (route.action == 'Batch') {
            var viewModel = new ns.BatchViewModel(models, {
                searchUrl: route.baseUrl + 'BatchList',
                finishUrl: route.baseUrl + 'BatchFinish'
            });
            viewModel.initialize();
            viewModel.registerQueryFormEvent();
            ko.applyBindings(viewModel);
        } else {
            var viewModel = new ns.ListViewModel(models, {
                isDeliver: route.isDeliver,
                isPledge: route.isPledge,
                searchUrl: route.baseUrl + 'ListWithNoDetails',
                deleteUrl: route.baseUrl + 'Delete',
                detailsUrl: route.baseUrl + 'ContractDetails',
                cancelUrl: route.baseUrl + 'Cancel',
                revertCancelUrl: route.baseUrl + 'RevertCancel',
                checkfinishUrl: route.baseUrl + 'CheckFinish',
                finishUrl: route.baseUrl + 'Finish',
                revertFinishUrl: route.baseUrl + 'RevertFinish',
                setStatusOfCommodityUrl: route.baseUrl + 'SetStatusOfCommodity',
                setStatusOfAmountUrl: route.baseUrl + 'SetStatusOfAmount',
                setStatusOfInvoiceUrl: route.baseUrl + 'SetStatusOfInvoice',
                getSapInfoUrl: route.baseUrl + 'GetSapInfo',
                saveSapInfoUrl: route.baseUrl + 'SaveSapInfo'
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            utils.responseStateChange();
            initialize(viewModel, models.getQuery());
            models.registerStateChange(function (query) {
                initialize(viewModel, query);
            });
        }
    });
};

ns.BatchViewModel = function (models, options) {
    var self = $.extend(this, models);
    var oldFindCustomer = self.findCustomer;
    self.findCustomer = function () {
        return oldFindCustomer.apply(self, arguments) || self.findBroker(arguments[0]);
    }
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.listLength = ko.computed(function () {
            return vm.list().length;
        }).extend({ throttle: 10 });
        vm.chosenItemsCount = 0;
        vm.previousSelection = { data: [], index: 0 };
        vm.currentSelection = ko.observable();
        vm.currentSelection.subscribe(function (newVal) {
            var data = vm.previousSelection.data, index = vm.previousSelection.index,
            start = Math.min(data[index], newVal),
            end = Math.max(data[index], newVal),
            list = vm.list();
            if (list[end].isSelected()) {
                while (start < end) {
                    if (!list[start].isSelected()) list[start].isSelected(true);
                    start++;
                }
            } else {
                while (start < end) {
                    if (list[start].isSelected()) list[start].isSelected(false);
                    start++;
                }
            }
            vm.previousSelection.index = (vm.previousSelection.index + 1) % 2;
        });
        vm.isAllSelecting = ko.observable(false);
        vm.isAllSelecting.subscribe(function (newVal) {
            if (newVal) {
                $.each(vm.list(), function (i, item) {
                    if (!item.isSelected()) item.isSelected(true);
                });
            } else {
                $.each(vm.list(), function (i, item) {
                    if (item.isSelected()) item.isSelected(false);
                });
            }
        });
        vm.fill = function (result) {
            vm.list.removeAll();
            for (var i = 0; i < result.Data.result.length; i++) {
                var item = result.Data.result[i];
                item.CommodityTotal = (function () {
                    var total = 0;
                    $.each(item.WFContractDetailInfoes, function (index, detail) {
                        total += detail.Weight;
                    });
                    return total;
                })();
                item.isSelected = ko.observable(false);
                item.isSelected.subscribe(function (newVal) {
                    if (newVal) vm.chosenItemsCount++;
                    else vm.chosenItemsCount--;
                });
                vm.list.push(item);
            }

            base._p(result.Data.pagination, options.searchUrl, vm.fill);
        }
    }

    viewModel.call(this);

    self.onSearch = function () {
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self._notCompletionType(self.NotCompletionType());
            self.fill(data);
        }, true, true);
    };

    self.NotCompletionType = ko.observable();
    self._notCompletionType = ko.observable();
    self.isBatchConfirmed = ko.observable();

    var displayTexts = {};
    displayTexts[self.Enums.NotCompletionTypeUI.Commodity] = '完成收/发货';
    displayTexts[self.Enums.NotCompletionTypeUI.Amount] = '完成收/付款';
    displayTexts[self.Enums.NotCompletionTypeUI.Invoice] = '完成收/发票';
    displayTexts[self.Enums.NotCompletionTypeUI.Contract] = '完成合同';
    self.displayText = ko.computed(function () {
        return displayTexts[self._notCompletionType()] || '批量完成';
    });

    self.onFinish = function () {
        self._onFinish();
    }

    function PreFinishedCheck() {
        if (self.chosenItemsCount == 0) {
            alert('请先选择合同，然后再执行批量操作');
            return false;
        }
        return true;
    }

    self.onPreFinished = function () {
        if (PreFinishedCheck()) {
            $('#FinishConfirmation').modal('show');
            return true;
        }
        return false;
    }

    self._onFinish = function (notCompletionType) {
        if (notCompletionType == undefined) notCompletionType = self._notCompletionType();
        var items = [], list = self.list();
        for (var i = 0, length = self.listLength() ; i < length; i++) {
            if (list[i].isSelected()) items.push(list[i].WFContractInfoId);
        }
        base._post(options.finishUrl, { items: items, notCompletionType: notCompletionType }, function (data) {
            setTimeout(function () {
                self.isBatchConfirmed(false);
                self.isAllSelecting(false);
                self.chosenItemsCount = 0;
                self.list([]);
                self.previousSelection.data = [];
                self.previousSelection.index = 0;
                self.onSearch();
            }, 30);
        });
        $('#FinishConfirmation').modal('hide');
    }

    self.onFinishCommodity = function () {
        if (self.onPreFinished()) self._notCompletionType(self.Enums.NotCompletionTypeUI.Commodity);
    }

    self.onFinishAmount = function () {
        if (self.onPreFinished()) self._notCompletionType(self.Enums.NotCompletionTypeUI.Amount);
    }

    self.onFinishInvoice = function () {
        if (self.onPreFinished()) self._notCompletionType(self.Enums.NotCompletionTypeUI.Invoice);
    }

    self.onFinishContract = function () {
        if (self.onPreFinished()) self._notCompletionType(self.Enums.NotCompletionTypeUI.Contract);
    }

    self.isStatusOfCommodityFinished = function (item) {
        return item.StatusOfCommodity === self.Enums.ContractCommodityStatus.Finished;
    };

    self.isStatusOfAmountFinished = function (item) {
        return item.StatusOfAmount === self.Enums.ContractAmountStatus.Finished;
    };

    self.isStatusOfInvoiceFinished = function (item) {
        return item.StatusOfInvoice === self.Enums.ContractInvoiceStatus.Finished;
    };

    self.isStatusOfContractFinished = function (item) {
        return item.StatusOfContract === self.Enums.ContractStatus.Finished;
    };

    self.initialize = self.onSearch;
}

ns.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var oldFindCustomer = self.findCustomer;
    self.findCustomer = function () {
        return oldFindCustomer.apply(self, arguments) || self.findBroker(arguments[0]);
    }
    var base = GMK.Features.FeatureBase;
    var contractTypeEnum = models.Enums.ContractType;
    self.contractType = contractTypeEnum.NormalContract;
    if (options.isDeliver) {
        self.contractType = contractTypeEnum.Delivery;
    } else if (options.isPledge) {
        self.contractType = contractTypeEnum.PledgeContract;
    }

    function _convertToContractViewModel(vm) {
        var item = $.extend(ko.mapping.fromJS(vm), {
            details: ko.observableArray(),
            commodityUrl: ko.observable(),
            amountUrl: ko.observable(),
            invoiceUrl: ko.observable(),
        });
        if (item.IsBuy() == true) {
            item.commodityUrl(GMK.Context.RootUrl + 'Warehouse/EntryRecords?ContractCode=' + item.ContractCode() + '&CommodityId=' + item.CommodityId() + '&ReceiveType=' + models.Enums.SpotReceiveType.ForContract);
            item.amountUrl(GMK.Context.RootUrl + 'Settlement/PaymentRequests?PayPurposeType=' + models.Enums.PayPurposeType.MainTrade + '&ContractId=' + item.WFContractInfoId());
            if (item.TradeType() & models.Enums.SimpleTradeType.Foreign) { //外贸重置发票链接
                item.invoiceUrl(GMK.Context.RootUrl + 'CommercialInvoice/ReceiveIndex?ContractId=' + item.WFContractInfoId() + '&ContractCode=' + item.ContractCode());
            } else
                item.invoiceUrl(GMK.Context.RootUrl + 'Invoice/ReceivingRecords?ContractId=' + item.WFContractInfoId() + '&ContractCode=' + item.ContractCode());
        } else {
            item.commodityUrl(GMK.Context.RootUrl + 'Warehouse/OutRecords?ContractCode=' + item.ContractCode() + '&CommodityId=' + item.CommodityId() + '&ReceiveType=' + models.Enums.SpotReceiveType.ForContract);
            item.amountUrl(GMK.Context.RootUrl + 'Settlement/ReceivingRecords?ContractId=' + item.WFContractInfoId());
            if (item.TradeType() & models.Enums.SimpleTradeType.Foreign) { //外贸重置发票链接
                item.invoiceUrl(GMK.Context.RootUrl + 'CommercialInvoice/PayIndex?ContractId=' + item.WFContractInfoId());
            } else
                item.invoiceUrl(GMK.Context.RootUrl + 'Invoice/InvoiceRequests?ContractId=' + item.WFContractInfoId());
        }

        item.CommodityTotal = ko.computed(function () {
            var total = 0;
            $.each(item.WFContractDetailInfoes(), function (index, detail) {
                total += detail.Weight();
            });
            return total;
        });
        item.redeems = ko.observableArray([]);
        item.isShowRedeem = ko.observable(true);
        return item;
    }

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.listLength = ko.computed(function () {
            return vm.list().length;
        }).extend({ throttle: 150 });
        vm.isDetailListing = ko.observable(true);
        vm.fill = function (result, initializeExpandable) {
            if (initializeExpandable == undefined) initializeExpandable = true;
            vm.list.removeAll();
            var list = [];
            for (var i = 0; i < result.Data.result.length; i++) {
                //vm.list.push($.extend(ko.mapping.fromJS(result.Data.result[i]), { details: ko.observableArray() }));

                list.push(_convertToContractViewModel(result.Data.result[i]));
            }
            vm.list(list);
            if (initializeExpandable) _initializeExpandable();
            base._p(result.Data.pagination, options.searchUrl, vm.fill, function () {
                var query = utils.serialize("#searchForm .gmk-data-field");
                query.ContractType = self.contractType;
                return query;
            });
        }
    }

    viewModel.call(this);

    self.currItem = null;
    self.RemarkNote = ko.observable('');

    self.onSearch = function () {
        self._search();
    };

    self._search = function () {
        utils.responseStateChange(false);
        var query = utils.serialize("#searchForm .gmk-data-field");
        query.ContractType = self.contractType;
        var old = $.ajaxSettings.traditional;
        $.ajaxSettings.traditional = true;
        base._get(options.searchUrl, query, function (data) {
            self.fill(data);
        }, true);
        $.ajaxSettings.traditional = old;
    }

    self.onCancel = function (callback) {
        return function (item) {
            self.currItem = item;
            self.RemarkNote('');
            callback();
        };
    };

    self.onSubmitCancel = function (validate, success) {
        return function () {
            if (validate()) {
                confirm('你确定要作废当前合同吗？', function () {
                    base._post(options.cancelUrl, {
                        contractId: self.currItem.WFContractInfoId(),
                        remarkNote: self.RemarkNote()
                    }, function (result) {
                        self.currItem.StatusOfContract(self.Enums.ContractStatus.Invalid);
                        self.list.remove(self.currItem);
                        self._search();
                        success();
                    });
                });
            }
        };
    };

    self.onRevertCancel = function (item, event) {
        confirm('你确定要取消作废当前合同吗？', function () {
            base._post(options.revertCancelUrl, {
                contractId: item.WFContractInfoId()
            }, function (result) {
                self.list.remove(item);
            });
        });
    };

    self.cancelable = function (item) {
        return item.StatusOfContract() === self.Enums.ContractStatus.Default;
    };

    self.revertCancelable = function (item) {
        return item.StatusOfContract() === self.Enums.ContractStatus.Invalid;
    };

    self.finishable = function (item) {
        return item.StatusOfContract() === self.Enums.ContractStatus.Default;
    };

    self.revertFinishable = function (item) {
        return item.StatusOfContract() === self.Enums.ContractStatus.Finished;
    };

    self.onFinish = function (callback) {
        return function (item) {
            base._post(options.checkfinishUrl,
                { contractId: item.WFContractInfoId() },
                function (result) {
                    item.StatusOfContract(self.Enums.ContractStatus.Finished);
                    self.currItem = item;
                    self.RemarkNote('');
                    callback();
                });
        };
    }

    self.onSubmitFinish = function (validate, success) {
        return function () {
            if (validate()) {
                base._post(options.finishUrl, {
                    contractId: self.currItem.WFContractInfoId(),
                    remarkNote: self.RemarkNote()
                }, function (result) {
                    self.currItem.StatusOfContract(self.Enums.ContractStatus.Finished);
                    success();
                    self._search();
                });
            }
        };
    };

    self.onRevertFinish = function (callback) {
        return function (item) {
            self.currItem = item;
            self.RemarkNote('');
            callback();
        };
    };

    self.onSubmitRevertFinish = function (validate, success) {
        return function () {
            if (validate()) {
                base._post(options.revertFinishUrl, {
                    contractId: self.currItem.WFContractInfoId(),
                    remarkNote: self.RemarkNote()
                }, function (result) {
                    self.currItem.StatusOfContract(self.Enums.ContractStatus.Default);
                    success();
                });
            }
        };
    };

    self.toCancelFlow = function (item) {
        self.currItem = item;
        self.RemarkNote('');
    };

    self.onCancelFlow = function (modal) {
        return function () {
            confirm('确定要撤销？', function () {
                base._post('WorkflowMessage/RequestCancelByObject', {
                    objectId: self.currItem.IsSyncApproval() && self.currItem.IsSyncApprovalFromOther() ? self.currItem.WFContractWhole.WFContractInfoes()[0].WFContractInfoId() : self.currItem.WFContractInfoId(),
                    flowType: models.Enums.ApprovalType.Contract,
                    note: self.RemarkNote()
                }, function (result) {
                    self.currItem.ApprovalStatus(models.Enums.ApprovalStatus.Cancelled);
                    $(modal).modal('hide');
                });
            });
        };
    };

    self.isStatusOfCommodityFinished = function (item) {
        return item.StatusOfCommodity() === self.Enums.ContractCommodityStatus.Finished;
    };

    self.isStatusOfAmountFinished = function (item) {
        return item.StatusOfAmount() === self.Enums.ContractAmountStatus.Finished;
    };

    self.isStatusOfInvoiceFinished = function (item) {
        return item.StatusOfInvoice() === self.Enums.ContractInvoiceStatus.Finished;
    };

    self.getOnSetStatusOfCommodity = function (setNewStatus, getCurrStatus, reset) {
        return function (item, event) {
            var newStatus = !getCurrStatus();
            confirm(newStatus ? '确定要设置货品状态为已完成吗？' : '确定要设置货品状态为未完成吗？', function () {
                base._post(options.setStatusOfCommodityUrl, {
                    contractId: item.WFContractInfoId(),
                    isCompleted: newStatus
                }, function (result) {
                    if (result.Status === true) {
                        item.StatusOfCommodity(newStatus ? self.Enums.ContractCommodityStatus.Finished : self.Enums.ContractCommodityStatus.Default);
                        if (setNewStatus) {
                            setNewStatus(newStatus);
                        }
                    } else {
                        if (reset) {
                            reset();
                        }
                        alert(result.Message);
                    }
                }).fail(function () {
                    if (reset) {
                        reset();
                    }
                    alert('ajax error');
                });
            }, function () {
                if (reset) {
                    reset();
                }
            });
            return false;
        };
    };

    self.getOnSetStatusOfAmount = function (setNewStatus, getCurrStatus, reset) {
        return function (item, event) {
            var newStatus = !getCurrStatus();
            confirm(newStatus ? '确定要设置款项状态为已完成吗？' : '确定要设置款项状态为未完成吗？', function () {
                base._post(options.setStatusOfAmountUrl, {
                    contractId: item.WFContractInfoId(),
                    isCompleted: newStatus
                }, function (result) {
                    if (result.Status === true) {
                        item.StatusOfAmount(newStatus ? self.Enums.ContractAmountStatus.Finished : self.Enums.ContractAmountStatus.Default);
                        if (setNewStatus) {
                            setNewStatus(newStatus);
                        }
                    } else {
                        if (reset) {
                            reset();
                        }
                        alert(result.Message);
                    }
                }).fail(function () {
                    if (reset) {
                        reset();
                    }
                    alert('ajax error');
                });
            }, function () {
                if (reset) {
                    reset();
                }
            })
            return false;
        };
    };

    self.getOnSetStatusOfInvoice = function (setNewStatus, getCurrStatus, reset) {
        return function (item, event) {
            var newStatus = !getCurrStatus();
            confirm(newStatus ? '确定要设置票据状态为已完成吗？' : '确定要设置票据状态为未完成吗？', function () {
                base._post(options.setStatusOfInvoiceUrl, {
                    contractId: item.WFContractInfoId(),
                    isCompleted: newStatus
                }, function (result) {
                    if (result.Status === true) {
                        item.StatusOfInvoice(newStatus ? self.Enums.ContractInvoiceStatus.Finished : self.Enums.ContractInvoiceStatus.Default);
                        if (setNewStatus) {
                            setNewStatus(newStatus);
                        }
                    } else {
                        if (reset) {
                            reset();
                        }
                        alert(result.Message);
                    }
                }).fail(function () {
                    if (reset) {
                        reset();
                    }
                    alert('ajax error');
                });
            }, function () {
                if (reset) {
                    reset();
                }
            });
            return false;
        };
    };
    function _showDetail(item, callback, isShowRedeem) {
        var isDetailListing = typeof (isShowRedeem) == "boolean" ? isShowRedeem : self.isDetailListing();

        if ((isDetailListing && item.details().length) || (!isDetailListing && item.redeems().length)) {
            if (callback) callback();
            return;
        }
        var param = (isDetailListing) ? { id: item.WFContractInfoId() } : {
            parentId: item.WFContractInfoId()
        };
        var url = (isDetailListing) ? options.detailsUrl : options.searchUrl;
        var details = isDetailListing ? item.details : item.redeems;
        base._get(url, param, function (result) {
            var data = isDetailListing ? result : result.Data.result;
            details.removeAll();
            for (var i = 0; i < data.length; i++) {
                details.push(isDetailListing ? data[i] : _convertToContractViewModel(data[i]));
            }
            if (callback) callback();
        }, true);
    }
    self.onShowDetail = function (item, e) {
        _showDetail(item, function () {
            if (expandingItem) {
                $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
            } else {
                $divQueryResult.expandable('sync', $(e.currentTarget).closest('tr').next());
            }
        });
    };

    self.onToggleRedeemDetail = function (item, e) {
        // self.isDetailListing(true);
        item.isShowRedeem(!item.isShowRedeem());
        if ($divQueryResult.expandable('isFolded', $(e.currentTarget).closest('tr').find('i.expand-row'))) $(e.currentTarget).closest('tr').find('i.expand-row').click();
        else self.onShowDetail(item, e);
    };

    self.onToggleDetails = function (item, e) {
        self.isDetailListing(!self.isDetailListing());
        if ($divQueryResult.expandable('isFolded', $(e.currentTarget).closest('tr').find('i.expand-row'))) $(e.currentTarget).closest('tr').find('i.expand-row').click();
        else self.onShowDetail(item, e);
    };

    self.onListDetails = function (item, e) {
        // self.isDetailListing(!self.isDetailListing());
        item.isShowRedeem(!item.isShowRedeem());
        _showDetail(item, function () {
            if (expandingItem) {
                $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
            } else {
                $divQueryResult.expandable('sync', $(e.currentTarget).closest('table').closest('tr'));
            }
        }, item.isShowRedeem());
    };

    self.onPreSaveSapInfo = function (item) {
        self.currItem = item;
        $('#sapInfoManagementForm .gmk-data-field').val('');
        $('#sapInfoManagementForm').modal('show');
        base._get(options.getSapInfoUrl, { id: item.WFContractInfoId() }, function (data) {
            utils.deserialize('#sapInfoManagementForm .gmk-data-field', data.Data);
        }, false);
    };

    self.onSaveSapInfo = function () {
        base._post(options.saveSapInfoUrl, { id: self.currItem.WFContractInfoId(), data: utils.serialize('#sapInfoManagementForm .gmk-data-field') }, function () {
            $('#sapInfoManagementForm').modal('hide');
        });
    };
    var expandingItem, $divQueryResult = $('#divQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.onShowDetail(self.list()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }
    self.initialize = function (query, success) {
        base._get(options.searchUrl, query, function (contracts) {
            self.fill(contracts, false);
            if (success) success();
            _initializeExpandable();
        }, true);
    };
    self.findConnectedCustomer = function (item) {
        var wfWhole = item.WFContractWhole;
        if (typeof (wfWhole) == 'object') {
            if (item.IsBuy()) {
                var corporation = findCorporation(wfWhole.SellCorporationId());
                var department = findDepartments(wfWhole.SellDepartmentId());
                return corporation + '-' + department;
            } else {
                var corporation = findCorporation(wfWhole.BuyCorporationId());
                var department = findDepartments(wfWhole.BuyDepartmentId());
                return corporation + '-' + department;
            }
        } else
            return '';
    }

    function findDepartments(id) {
        var item = $.grep(self.AllBusinessDepartments, function (r) {
            return r.id === id;
        });
        return item[0] != null ? item[0].name : '';
    }

    function findCorporation(id) {
        var item = models._findCompany(id);
        return item ? (item.shortName || item.name) : '';
    }

}
