var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.Contract.BatchViewModel(models, {
            searchUrl: 'Contract/BatchList',
            generateFeeUrl: 'Contract/GenerateFee',
            listFeeConfiguration: 'WarehouseInfo/ListFeeTypes',
            finishPaymentUrl: 'WarehouseInfo/finishPayment'
        });
        viewModel.commonModels.registerQueryFormEvent();
        ko.applyBindings(viewModel);
        viewModel.initialize();
    });
};
GMK.Contract.BatchViewModel = function (models, actions) {
    var self = this;
    self.commonModels = models;
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
        vm.feeTypes = ko.observableArray();
        vm.allFeeTypes = ko.observableArray();

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

            base._p(result.Data.pagination, actions.searchUrl, vm.fill);
        }
    }

    viewModel.call(this);

    self.finishPaymentViewModel = {
        paymentDate: ko.observable(),
        dateRange: ko.observable(),
        feeTypes: ko.observableArray()
    };

    self.onSearch = function () {
        base._get(actions.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.fill(data);
        }, true, true);
    };

    self.generationMode = ko.observable();

    var displayTexts = self.displayTexts = {};
    self.displayText = ko.computed(function () {
        return displayTexts[self.generationMode()];
    });

    function PreFinishedCheck() {
        if (self.chosenItemsCount == 0) {
            alert('请先选择合同，然后再执行批量操作');
            return false;
        }
        return true;
    }

    self.onGenerate = function () {
        if (self.generationMode() == 'finishPayment') {
            if (!PreFinishedCheck()) return;
            $('#FinishPaymentForm').modal('show');
        } else {
            _generate();
        }
    };
    function _generate(e) {
        if (!PreFinishedCheck()) return;
        var items = [], list = self.list();
        for (var i = 0, length = self.listLength() ; i < length; i++) {
            if (list[i].isSelected()) items.push(list[i].WFContractInfoId);
        }
        base._post(actions.generateFeeUrl, { items: items, costFeeType: self.generationMode() });
    }
    self.onGeneratefromMenu = function (item, e) {
        var generationType = $(e.currentTarget).data('generation-type');
        self.generationMode(generationType);
        if (generationType == 'finishPayment') {
            if (!PreFinishedCheck()) return;
            $('#FinishPaymentForm').modal('show');
        } else {
            self.onGenerate();
        }
    }

    self.onSaveFinishPayment = function () {
        var items = [], list = self.list();
        for (var i = 0, length = self.listLength() ; i < length; i++) {
            if (list[i].isSelected()) items.push(list[i].WFContractInfoId);
        }
        base._post(actions.finishPaymentUrl, { data: ko.mapping.toJS(self.finishPaymentViewModel), contractInfoIds:items }, function (data) {
            $('#FinishPaymentForm').modal('hide');
        });
    };

    self.isStatusOfCommodityFinished = function (item) {
        return item.StatusOfCommodity === self.commonModels.Enums.ContractCommodityStatus.Finished;
    };

    self.isStatusOfAmountFinished = function (item) {
        return item.StatusOfAmount === self.commonModels.Enums.ContractAmountStatus.Finished;
    };

    self.isStatusOfInvoiceFinished = function (item) {
        return item.StatusOfInvoice === self.commonModels.Enums.ContractInvoiceStatus.Finished;
    };

    self.isStatusOfContractFinished = function (item) {
        return item.StatusOfContract === self.commonModels.Enums.ContractStatus.Finished;
    };

    self.initialize = function () {
        base._get(actions.listFeeConfiguration, {}, function (data) {
            self.allFeeTypes(data);
            data = $.grep(data, function (item) {
                return item.ableAutoGenerate;
            })
            $.each(data, function (i, item) {
                displayTexts[item.wfSystemFeeId] = '生成' + item.feeName;
            });
            self.displayTexts['finishPayment'] = '批量完成财务付款';
            self.generationMode(data[0].wfSystemFeeId);
            data.push({wfSystemFeeId:'finishPayment'});
            self.feeTypes(data);
        }, false).success(self.onSearch);
    };
}

$(document).ready(function () {
    GMK.Contract.start();
});
