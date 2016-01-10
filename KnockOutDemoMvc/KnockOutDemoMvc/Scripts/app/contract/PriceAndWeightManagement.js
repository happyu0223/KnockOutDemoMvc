/**
 * Created by dawson.liu on 13-10-16.
 */

var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.PriceAndWeightManagement = GMK.Contract.PriceAndWeightManagement || {};

GMK.Contract.PriceAndWeightManagement.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var url = $.url(), viewModel = new GMK.Contract.PriceAndWeightManagement.DefaultViewModel(models, {
            listUrl: 'Contract/ListContractEntryRecordDetails',
            getUrl: 'Contract/GetContractTradeRecords',
            saveUrl: 'Contract/Save{0}ContractTradeRecord'.format(url.param('isBuy') === 'true' ? 'Buy' : 'Sale'),
            batchUrl: 'Contract/SavePremiumDiscountBatch',
            id: url.param('id'),
            isBuy: url.param('isBuy')
        });
        viewModel.initialize();
        ko.applyBindings(viewModel);
        ko.utils.InlineEditorInitialize(viewModel.onUpdatePremiumDiscount);
    });
};

GMK.Contract.PriceAndWeightManagement.DefaultViewModel = function (models, options) {
    var self = this;
    self.commonModels = models;
    $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.premiumDiscount = ko.observable();
        vm.basePrice = ko.observable();
        self.message = ko.observable();
        vm.isAllSelect = ko.observable();
        vm.isAllSelect.subscribe(function (newVal) {
            $.each(vm.list(), function (i, item) {
                item.isSelect(newVal);
            });
        });
        vm.isBuy = options.isBuy == 'true';
        vm.totalActualWeight = ko.observable(0);
        vm.tradeRecords = ko.observableArray();
        vm.remainingWeight = ko.computed(function(){
            var result = vm.totalActualWeight();
            $.each(vm.tradeRecords(), function(i, item){
                result -= parseFloat((item.ActualWeight() == null || item.ActualWeight() == 0) ? item.Weight() : item.ActualWeight());
            });
            return result;
        })
        vm.contractInfo = ko.observable();
        vm.note = ko.observable();

        vm.fill = function (data) {
            $.each(data.Data.details, function (i, item) {
                item.isDetailShow = ko.observable(false);
                item.isSelect = ko.observable(false);
                if (item.WFBuyContractTradeRecords != undefined) {
                    item.WFBuyContractTradeRecords = ko.mapping.fromJS(item.WFBuyContractTradeRecords);
                }
                if (item.WFSaleContractTradeRecords != undefined) {
                    item.WFSaleContractTradeRecords = ko.mapping.fromJS(item.WFSaleContractTradeRecords);
                }
            });
            vm.list(data.Data.details);
            vm.contractInfo(data.Data.contract);
            vm.note(data.Data.note);
        };
        vm.toJson = function(){
            return ko.mapping.toJS(vm.tradeRecords);
        };
    }

    viewModel.call(this);
    ko.SlimCheckExtension.call(this, this.list, {
        isSelectedObservable: function (item) {
            return item.isSelect;
        }
    });

    self.selectedTotalWeights = ko.observable();
    self.selectedItemsLength = ko.computed(function () {
        var result = 0, total = 0;
        $.each(self.list(), function (i, item) {
            if (item.isSelect()) {
                total = total + utils.parseFloat(item.ActualWeight);
                result++;
            }
        });
        self.selectedTotalWeights(total);
        return result;
    });
    self.onPreBatch = function (item, event) {
        var list = $.map($.grep(self.list(), function (item) {
            return item.isSelect();
        }), function (item) {
            return item.WFContractEntryRecordDetailId || item.WFContractOutRecordDetailId;
        });
        if (list.length == 0) {
            alert('请先选择出/入库记录');
            return;
        };
        $($(event.currentTarget).data('target')).modal('show');
    };
    self.onCloseAlert = function () {
        self.message('');
    };
    $('#formBatchPremiumDiscount input').focusout(function () {
        if ($(this).val()) self.message('');
    });
    self.onBatch = function (item, event) {
        if (!self.premiumDiscount() && !self.basePrice()) {
            self.message('基价和升贴水不能同时为空');
            return;
        }
        var observableList = $.grep(self.list(), function (item) {
            return item.isSelect();
        });
        var list = $.map(observableList, function (item) {
            return item.WFContractEntryRecordDetailId || item.WFContractOutRecordDetailId;
        });
        base._post(options.batchUrl, {
            list: list,
            firePriceInfo: {
                premiumDiscount: self.premiumDiscount(),
                basePrice:self.basePrice()
            },
            isBuy: self.isBuy
        }, function () {
            var premiumDiscount = self.premiumDiscount(), basePrice = self.basePrice();
            $.each(observableList, function (i, item) {
                $.each(self.isBuy ? item.WFBuyContractTradeRecords() : item.WFSaleContractTradeRecords(), function (i, item) {
                    if (premiumDiscount) item.PremiumDiscount(premiumDiscount);
                    if (basePrice) item.BasePrice(basePrice);
                });
            });
            self.premiumDiscount('');
            self.basePrice('');
            $(event.currentTarget).closest('.modal').modal('hide');
        });
    };
    self.onUpdatePremiumDiscount = function (url, viewModel, newVal, callback, source, allBindings) {
        var isUpdatingPremiumDiscount = (url.indexOf('UpdatePremiumDiscount') >= 0), params = isUpdatingPremiumDiscount ? {
            id: viewModel.WFBuyContractTradeRecordId != undefined ? viewModel.WFBuyContractTradeRecordId() : viewModel.WFSaleContractTradeRecordId(),
            premiumDiscount: newVal, isBuy: self.isBuy
        } : {
            id: viewModel.WFBuyContractTradeRecordId != undefined ? viewModel.WFBuyContractTradeRecordId() : viewModel.WFSaleContractTradeRecordId(),
            basePrice: newVal, isBuy: self.isBuy
        };

        base._post(url, params, function () {
            if (isUpdatingPremiumDiscount) viewModel.PremiumDiscount(newVal);
            else viewModel.BasePrice(newVal);
            $.each(source.closest('tr').find('.gmk-amount'), function (i, item) {
                var $item = $(item);
                $item.text(accounting.formatNumber($item.text(), models.settings.decimalDigits));
            });
            callback();
        });
    };

    self.onSave = function (data, event) {
        base._post(options.saveUrl, self.toJson(), function (data) {
            $(event.currentTarget).closest('.modal').modal('hide');
            fetchContractTradeRecords(self.currentItem);
            utils.formatDecimal();
        });
    };

    self.onAddItem = function(item, event){
        var newItem = {
            ActualWeight: ko.observable(self.remainingWeight()),
            BasePrice: ko.observable(self.currentBasePrice),
            PremiumDiscount: ko.observable(),
            Price: ko.observable(self.currentBasePrice),
            Note: ko.observable()
        };
        if (self.isBuy) newItem.WFContractEntryRecordDetailId = self.recordDetailId;
        else newItem.WFContractOutRecordDetailId = self.recordDetailId;
        newItem.PremiumDiscount.subscribe(function (newVal) {
            newItem.Price(utils.parseFloat(newVal) + utils.parseFloat(newItem.BasePrice()));
        });
        newItem.BasePrice.subscribe(function (newVal) {
            newItem.Price(utils.parseFloat(newVal) + utils.parseFloat(newItem.PremiumDiscount()));
        });
        self.tradeRecords.push(newItem);
        utils.formatDecimal();
    };

    self.onRemoveItem = function(item, event){
        self.tradeRecords.remove(item);
    };

    function fetchContractTradeRecords(item) {
        base._get(options.getUrl, { recordDetailId: self.recordDetailId, isBuy: self.isBuy }, function (data) {
            if (item.WFBuyContractTradeRecords != undefined) {
                ko.mapping.fromJS(data.Data, item.WFBuyContractTradeRecords);
                $.each(item.WFBuyContractTradeRecords(), function (i, item) {
                    item.PremiumDiscount.subscribe(function (newVal) {
                        item.Price(utils.parseFloat(newVal) + utils.parseFloat(item.BasePrice()));
                    });
                    item.BasePrice.subscribe(function (newVal) {
                        item.Price(utils.parseFloat(newVal) + utils.parseFloat(item.PremiumDiscount()));
                    });
                });
                self.tradeRecords(item.WFBuyContractTradeRecords());
            } else if (item.WFSaleContractTradeRecords != undefined) {
                ko.mapping.fromJS(data.Data, item.WFSaleContractTradeRecords);
                $.each(item.WFSaleContractTradeRecords(), function (i, item) {
                    item.PremiumDiscount.subscribe(function (newVal) {
                        item.Price(utils.parseFloat(newVal) + utils.parseFloat(item.BasePrice()));
                    });
                    item.BasePrice.subscribe(function (newVal) {
                        item.Price(utils.parseFloat(newVal) + utils.parseFloat(item.PremiumDiscount()));
                    });
                });
                self.tradeRecords(item.WFSaleContractTradeRecords());
            }
            self.currentBasePrice = self.tradeRecords()[0].BasePrice();
            item.isDetailFetched = true;
            utils.formatDecimal();
        });
    }

    self.onShowEditor = function (item, event) {
        self.totalActualWeight((item.ActualWeight == null || item.ActualWeight == 0) ? item.Weight : item.ActualWeight);
        self.recordDetailId = item.WFContractEntryRecordDetailId || item.WFContractOutRecordDetailId;
        self.currentItem = item;
        if (item.isDetailFetched) {
            self.tradeRecords(item.WFContractEntryRecordDetailId ? item.WFBuyContractTradeRecords() : item.WFSaleContractTradeRecords());
            self.currentBasePrice = self.tradeRecords()[0].BasePrice();
            utils.formatDecimal();
        } else {
            fetchContractTradeRecords(item);
        }
    };

    self.toggleShowDetails = function (item) {
        if (!item.isDetailFetched) {
            self.recordDetailId = item.WFContractEntryRecordDetailId || item.WFContractOutRecordDetailId;
            fetchContractTradeRecords(item);
        }
        item.isDetailShow(!item.isDetailShow());
    };

    self.initialize = function () {
        base._get(options.listUrl, { id: options.id, isBuy: self.isBuy, loadingContractDetail:true }, function (data) {
            self.fill(data);
            if (data.length > 0) self.isBuy = !!data[0].WFWarehouseEntryRecordId;
        }, true);
    };
}

$(document).ready(function () {
    GMK.Contract.PriceAndWeightManagement.start();
});
