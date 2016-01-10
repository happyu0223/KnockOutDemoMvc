
var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.FirePrice = GMK.Contract.FirePrice || {};

GMK.Contract.FirePrice.start = function (route, element) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            var viewModel = new GMK.Contract.FirePrice.IndexViewModel(commonModels, route, {
                listUrl: route.baseUrl + 'List',
                listFpcUrl: route.baseUrl + 'ListFpc',
                deleteUrl: route.baseUrl + 'Delete',
                deleteFpcUrl: route.baseUrl + 'DeleteFpc',
                finishUrl: route.baseUrl + 'Finish',
                createUrl: route.baseUrl + 'Create',
                editUrl: route.baseUrl + 'Edit',
                savePostponedFpcUrl: route.baseUrl + 'savePostponedFpc',
                deletePostponedFpcUrl: route.baseUrl + 'deletePostponedFpc',
                ListPostponedFpcUrl: route.baseUrl + 'ListPostponedFpc',
                getPostponeInformationByIdUrl: route.baseUrl + 'GetPostponeInformationById',
                addReceivingUrl: route.addReceivingUrl,
                requestCreateUrl: route.requestCreateUrl,
                archiveIndexIndexUrl: route.archiveIndex,
                cancelFlowUrl: 'WorkflowMessage/RequestCancelByObject',
                generatePostponeConfirmCodeUrl: route.baseUrl + 'GeneratePostponeConfirmCodeByPriceDetailId'
            });
            window.vm = viewModel;
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
        } else if (route.action === 'CreateFpc') {
            var viewModel = new GMK.Contract.FirePrice.CreateFpcViewModel(commonModels, route, {
                indexUrl: route.indexUrl,
                saveUrl: route.baseUrl + 'CreateFpc',
                notconfirmedUrl: route.baseUrl + 'ListNotconfirmed',
                archiveIndexIndexUrl: route.archiveIndexIndex,
                anchor: '#tabFpc'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
        } else if (route.action === 'EditFpc') {
            var viewModel = new GMK.Contract.FirePrice.EditFpcViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'GetFpc',
                indexUrl: route.indexUrl,
                saveUrl: route.baseUrl + 'EditFpc',
                notconfirmedUrl: route.baseUrl + 'ListNotconfirmed',
                anchor: '#tabFpc'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
        } else if (route.action === 'DetailsFpc') {
            var viewModel = new GMK.Contract.FirePrice.DetailsFpcViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'GetFpc',
                indexUrl: route.indexUrl,
                anchor: '#tabFpc'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
            utils.formatDecimal();
        }
    });
};

GMK.Contract.FirePrice.RecordItemViewModel = function (item, getIsBuyerFire) {
    var self = $.extend(this, ko.mapping.fromJS(item));
    self.isSelected = ko.observable();
    self.IsDefered.subscribe(function (val) {
        if (!val) {
            self.DeferedFee('');
        }
    });
    self.SettlementPrice(utils.roundAmount(self.SettlementPrice()));

    function recomputeSettlementPrice() {
        self.SettlementPrice(utils.roundAmount(utils.parseFloat(self.Price()) + utils.parseFloat(self.PremiumDiscount()) + (getIsBuyerFire() ? 1 : -1) * utils.parseFloat(self.DeferedFee()) + utils.parseFloat(self.SwapFee())));
    }

    self.Price.subscribe(recomputeSettlementPrice);
    self.PremiumDiscount.subscribe(recomputeSettlementPrice);
    self.DeferedFee.subscribe(recomputeSettlementPrice);
    self.SwapFee.subscribe(recomputeSettlementPrice);
};

GMK.Contract.FirePrice.ConfirmItemViewModel = function (item) {
    var self = $.extend(this, ko.mapping.fromJS(item));

};

GMK.Contract.FirePrice.IndexViewModel = function (commonModels, route, options) {
    var self = $.extend(this, commonModels);

    self.priceDetail = route.values.priceDetail;
    self.priceDetailId = route.values.priceDetailId;
    self.contract = route.values.contract;
    self.firePrice = self.priceDetail ? self.priceDetail.WFFirePriceDetail : null;
    self.unit = commonModels.findById(commonModels.AllUnits, self.priceDetail.WFPriceInfo.UnitId);
    self.currency = commonModels.findById(commonModels.AllCurrencies, self.priceDetail.WFPriceInfo.CurrencyId);

    self.postponedFirePriceInfo = route.values.postponedFirePriceInfo;
    self.postponedFirePriceInfo.IsPostponed = ko.observable(self.postponedFirePriceInfo.IsPostponed);
    self.isFireCompleted = ko.observable(route.values.isFireCompleted);
    self.approvalStatus = route.values.approvalStatus;
    self.isStatusOfFirePriceDisabled = ko.computed(function () {
        return self.isFireCompleted() && !self.hasPermission('CancelFinishFirePrice');
    });
    self.sumWeight = route.values.sumWeight;
    self.priceType = route.values.priceType;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.fpcItems = ko.observableArray();
    self.remarkNote = ko.observable();
    self.fill = function (data) {
        var mapped = $.map(data, function (item) {
            return new GMK.Contract.FirePrice.RecordItemViewModel(item, function () {
                return self.firePrice.IsBuyerFire;
            });
        });
        self.items(mapped);
    };
    self.goToAddReceiving = function () {
        var data = $.grep(self.items(), function (item) {
            return item.isSelected();
        });
        if (!data.length) {
            alert('请选择至少一条点价记录');
            return;
        }
        data = $.map(data, function (item) {
            return item.WFFirePriceRecordId;
        });
        data = { firePriceRecordIds: data };
        var old = $.ajaxSettings.traditional;
        $.ajaxSettings.traditional = true;
        window.location.href = options.addReceivingUrl + '?' + $.param(data);
        $.ajaxSettings.traditional = old;
    };
    self.fillFpcItems = function (data) {
        self.fpcItems.removeAll();
        for (var i = 0, l = data.length; i < l; i++) {
            self.fpcItems.push(new GMK.Contract.FirePrice.ConfirmItemViewModel(data[i]));
        }
    };
    self.initialize = function () {
        self.loadItems();
        self.loadFpcs();
        self.loadPfpcs();
        if (commonModels.isForeignExchange(self.firePrice.PriceMarket)) {
            self.postponedFirePrices.initToInstrument(self);
            self.postponedFirePrices.initFromInstrument(self);
        }
    };
    self.loadItems = function (callback) {
        base._get(options.listUrl, {
            detailId: self.priceDetailId
        }, function (result) {
            if (result.Status === true) {
                self.fill(result.Data);
                if (callback) {
                    callback();
                }
            }
        });
    };
    self.loadFpcs = function (callback) {
        base._get(options.listFpcUrl, {
            detailId: self.priceDetailId
        }, function (result) {
            if (result.Status === true) {
                self.fillFpcItems(result.Data);
                if (callback) {
                    callback();
                }
            }
        });
    };
    self.loadPfpcs = function (callback) {
        base._get(options.ListPostponedFpcUrl, {
            detailId: self.priceDetailId
        }, function (result) {
            self.postponedFirePrices.reset(result.data);
            if (callback) {
                callback();
            }
        });
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFFirePriceRecordId()
        }, function () {
            self.items.remove(item);
            base._get(options.getPostponeInformationByIdUrl, { detailId: self.priceDetailId }, function (result) {
                self.postponedFirePriceInfo.IsPostponed(result.Data.IsPostponed);
                self.postponedFirePriceInfo.PostponeFine = result.Data.PostponeFine;
                self.postponedFirePriceInfo.AvailableWeight = result.Data.AvailableWeight;
                self.postponedFirePriceInfo.InstrumentId = result.Data.InstrumentId;
            });
        });
    };
    self.onDeleteFpc = function (item) {
        base._delete(options.deleteFpcUrl, {
            id: item.WFFirePriceConfirmId()
        }, function () {
            self.fpcItems.remove(item);
        })
    };
    var currentFpc;
    self.toCancelFpcFlow = function (item) {
        currentFpc = item;
    };
    self.onCancelFpcFlow = function (item, e) {
        base._post(options.cancelFlowUrl, { objectId: currentFpc.WFFirePriceConfirmId(), flowType: commonModels.Enums.ApprovalType.FirePriceConfirmBill, note: self.remarkNote() }, function () {
            currentFpc.ApprovalStatus(commonModels.Enums.ApprovalStatus.Cancelled);
            currentFpc = null;
            $(e.currentTarget).closest('.modal').modal('hide');
        });
    };
    self.onFinish = function (item, event) {
        base._post(options.finishUrl, {
            contractId: self.contract.WFContractInfoId,
            detailId: self.priceDetailId,
            isFinished: self.isFireCompleted()
        }, function (result) {
            if (result.Status) {
                $(event.currentTarget).closest('.modal').modal('hide');
            } else {
                self.isFireCompleted(!self.isFireCompleted());
                alert(result.Message);
            }
        });
    };
    self.SwitchChangeHandler = function () {
        var param = arguments[1], $elem = param.el, value = param.value, $target = $($elem.data('target'));
        $target.modal({ keyboard: false });
        $target.modal('show');
    };
    self.CloseFinishFirePriceConfirm = function () {
        $('#finishFirePriceConfirm').modal('hide');
        self.isFireCompleted(!self.isFireCompleted());
    };
    self.firedWeight = ko.computed(function () {
        var weight = 0;
        ko.utils.arrayForEach(self.items(), function (item) {
            weight += parseFloat(item.Weight());
        });
        return weight;
    });
    self.averagePrice = ko.computed(function () {
        if (self.priceType === self.Enums.PriceCalculationType.WeightAvg) {
            var weight = 0;
            var sum = 0, price;
            ko.utils.arrayForEach(self.items(), function (item) {
                weight += parseFloat(item.Weight());
                price = parseFloat(item.Price());
                if (item.IsDefered()) price += parseFloat(item.DeferedFee());
                sum += parseFloat(item.Weight()) * price;
            });
            return (sum / weight) || '待定';
        } else if (self.priceType === self.Enums.PriceCalculationType.ArithmeticAvg) {
            var count = 0;
            var sum = 0;
            ko.utils.arrayForEach(self.items(), function (item) {
                count += 1;
                sum += parseFloat(item.Price());
                if (item.IsDefered()) sum += parseFloat(item.DeferedFee());
            });
            return (sum / count) || '待定';
        } else {
            return '待定';
        }
    });
    self.averagePremiumDiscount = ko.computed(function () {
        if (self.priceType === self.Enums.PriceCalculationType.WeightAvg) {
            var weight = 0;
            var sum = 0;
            ko.utils.arrayForEach(self.items(), function (item) {
                weight += parseFloat(item.Weight());
                sum += parseFloat(item.Weight()) * parseFloat(item.PremiumDiscount());
            });
            return (sum / weight) || '待定';
        } else if (self.priceType === self.Enums.PriceCalculationType.ArithmeticAvg) {
            var count = 0;
            var sum = 0;
            ko.utils.arrayForEach(self.items(), function (item) {
                count += 1;
                sum += parseFloat(item.PremiumDiscount());
            });
            return (sum / count) || '待定';
        } else {
            return '待定';
        }
    });
    self.averageSettlementPrice = ko.computed(function () {
        if (self.priceType === self.Enums.PriceCalculationType.WeightAvg) {
            var weight = 0;
            var sum = 0;
            ko.utils.arrayForEach(self.items(), function (item) {
                weight += parseFloat(item.Weight());
                sum += parseFloat(item.Weight()) * parseFloat(item.SettlementPrice());
            });
            return (sum / weight) || '待定';
        } else if (self.priceType === self.Enums.PriceCalculationType.ArithmeticAvg) {
            var count = 0;
            var sum = 0;
            ko.utils.arrayForEach(self.items(), function (item) {
                count += 1;
                sum += parseFloat(item.SettlementPrice());
            });
            return (sum / count) || '待定';
        } else {
            return '待定';
        }
    });

    //route.addCallback = function (item) {
    //    self.items.push(item);
    //};
    route.loadItems = self.loadItems;
    self.firePriceViewModel = new GMK.Contract.FirePrice.FirePriceViewModel(commonModels, route, options, self.postponedFirePriceInfo);
    var commodityTypeId = (utils.find(commonModels.AllCommodities, function (r) {
        return r.id === route.values.commodityId;
    }) || {}).commodityTypeId;
    
    self.isPostponedFire = ko.observable(route.values.isPostponedFire);

    self.preAddFirePrice = function () {
        self.firePriceViewModel.initialize(false,null,self.sumWeight - self.firedWeight()); //未点价重量传入
    };
    self.preEditingFirePrice = function (item) {
        self.firePriceViewModel.initialize(true, item, self.sumWeight - self.firedWeight());
    };

    function PostponedFirePriceCollectionViewModel(items) {
        this._internal = ko.observableArray();
        if (items) this._internal(ko.mapping.fromJS(items)());
        this.current = null;
        this.isEdit = ko.observable();
        this.remarkNote = ko.observable();
        this.editing = {
            fromInstrument: ko.observable(),
            toInstrument: ko.observable(),
            weight: ko.observable(),
            fee: ko.observable(),
            note: ko.observable(),
            wfFirePricePostponeConfirmId: null,
            code: ko.observable(),
            wfPriceDetail: self.priceDetail,
            wfPriceDetailId: self.priceDetailId,
            toInstrumentDate: ko.observable(),
            fromInstrumentDate:ko.observable(),
        };
        var allInstruments = $.grep(self.AllInstruments(), function (r) {
            return r.commodityTypeId === commodityTypeId && r.exchangeId == self.firePrice.PriceMarket;
        });
        var pp = this;
        this.postponedInstruments = ko.computed(function () {
            if (pp.editing) {
                var instrument = commonModels.findById(self.AllInstruments(), pp.editing.fromInstrument());
                return $.grep(allInstruments, function (r) {
                    return instrument ? utils.compareDate(r.lastTradingDay, instrument.lastTradingDay) : r;
                });
            } else
                return allInstruments;
        });
    }
    PostponedFirePriceCollectionViewModel.prototype = {
        setCurrent: function (item) {
            this.current = item;
            ko.mapping.fromJS(ko.mapping.toJS(this.current), {
                include: Object.getOwnPropertyNames(this.current)
            }, this.editing);
        },
        reset: function (items) {
            this._internal(ko.mapping.fromJS(items)());
        },
        save: function (callback) {
            var pfpc = this;
            if (!this.editing.wfFirePricePostponeConfirmId) this.editing.wfPriceDetailId = route.values.priceDetailId;
            var param = ko.mapping.toJS(this.editing);
            if (commonModels.isForeignExchange(self.firePrice.PriceMarket)) {
                if (this.editing.toInstrumentDate()) {                    
                    var instrument = commonModels.findDateCodeInstrument(this.editing.toInstrumentDate());
                    if (instrument)
                        param.toInstrument = instrument.id;
                    else {
                        alert('您选择的延期至合约暂未设置，请联系管理员。'); return false;
                    }
                }
                if (this.editing.fromInstrumentDate()) {                   
                    var instrument = commonModels.findDateCodeInstrument(this.editing.fromInstrumentDate());
                    if (instrument)
                        param.fromInstrument = instrument.id;
                    else {
                        alert('您选择的需延期合约暂未设置，请联系管理员。'); return false;
                    }
                }
            }

            return base._post(options.savePostponedFpcUrl, param , function (result) {
                self.loadPfpcs();
                //if (pfpc.editing.wfFirePricePostponeConfirmId) {
                //    ko.mapping.fromJS(ko.mapping.toJS(pfpc.editing), {
                //        include: Object.getOwnPropertyNames(pfpc.current)
                //    }, pfpc.current);
                //} else {
                //    pfpc.editing.wfFirePricePostponeConfirmId = result.extraData;
                //    pfpc.editing.approvalStatus = commonModels.Enums.ApprovalStatus.None;
                //    pfpc._internal.push(ko.mapping.fromJS(ko.mapping.toJS(pfpc.editing)));
                //}
                if (callback) {
                    callback(result);
                }
            });
        },
        'delete': function (item, callback) {
            var self = this;
            base._delete(options.deletePostponedFpcUrl, { wfFirePricePostponeConfirmId: item.wfFirePricePostponeConfirmId() }, function () {
                self._internal.remove(item);
                if (self._internal().length == 0) callback(true);
            });
        },
        toCancelFlow: function (item, e) {
            this.setCurrent(item);
        },
        onCancelFlow: function (item, e) {
            var self = this;
            base._post(options.cancelFlowUrl, { objectId: self.current.wfFirePricePostponeConfirmId(), flowType: commonModels.Enums.ApprovalType.FirePricePostponeConfirm, note: self.remarkNote() }, function () {
                self.current.approvalStatus(commonModels.Enums.ApprovalStatus.Cancelled);
                $(e.currentTarget).closest('.modal').modal('hide');
            });
        },        
        onGeneratePostponeConfirmCode: function (item, e) {
            var self = this;
            base._get(options.generatePostponeConfirmCodeUrl, { detailId: route.values.priceDetailId }, function (data) {
                self.code(data.data);
            }, false);
        },
        initFromInstrument: function (parent) {
            var self = this;
            var _untradableDaysCache = {};
            var _lastKey;
            function _getUntradableDays(exchangeId, startDate, callback) {
                var key = exchangeId + '_' + startDate.valueOf();
                if (_lastKey == key) {
                    $('#postponedFromInstrumentDate').datepicker('show');
                    return;
                }
                _lastKey = key;
                if (_untradableDaysCache[key]) {
                    callback(_untradableDaysCache[key]);
                }
                base._get("Contract/GetUntradableDays", { exchangeId: exchangeId, startDate: utils.formatDate(startDate) }, function (result) {
                    result.data = $.map(result.data, function (d) {
                        return moment(d).toDate();
                    });
                    _untradableDaysCache[key] = result.data;
                    callback(result.data);
                });
            }
            var _showInstrumentDatepicker = (function () {
                var lastDate = parent.firePrice.FireStartDate || parent.contract.SignDate;
                _getUntradableDays(parent.firePrice.PriceMarket, moment(lastDate).startOf('d').toDate(), function (data) {
                    $('#postponedFromInstrumentDate').datepicker('option', 'minDate', utils.parseDate(lastDate));
                    $('#postponedFromInstrumentDate').datepicker('option', 'disabledDates', data).datepicker('show');
                });
            }).bind(self);
            $('#postponedFromInstrumentDate').focusin(_showInstrumentDatepicker);
            var _methods = {
                onCloseFromInsrumentDate: function () {
                    $('#postponedFromInstrumentDate').off('.focusin').focusin(_showInstrumentDatepicker);
                }
            };
            $.extend(self, _methods);
        },
        initToInstrument: function (parent) {
            var self = this;
            var _untradableDaysCache = {};
            var _lastKey;
            function _getUntradableDays(exchangeId, startDate, callback) {
                var key = exchangeId + '_' + startDate.valueOf();
                if (_lastKey == key) {
                    $('#postponedToInstrumentDate').datepicker('show');
                    return;
                }
                _lastKey = key;
                if (_untradableDaysCache[key]) {
                    callback(_untradableDaysCache[key]);
                }
                base._get("Contract/GetUntradableDays", { exchangeId: exchangeId, startDate: utils.formatDate(startDate) }, function (result) {
                    result.data = $.map(result.data, function (d) {
                        return moment(d).toDate();
                    });
                    _untradableDaysCache[key] = result.data;
                    callback(result.data);
                });
            }
            var _showInstrumentDatepicker = (function () {
                var lastDate = parent.firePrice.FireStartDate;
                if (self.editing.fromInstrumentDate())
                    lastDate = self.editing.fromInstrumentDate();
                _getUntradableDays(parent.firePrice.PriceMarket, moment(lastDate).startOf('d').toDate(), function (data) {
                    $('#postponedToInstrumentDate').datepicker('option', 'minDate', utils.parseDate(lastDate));
                    $('#postponedToInstrumentDate').datepicker('option', 'disabledDates', data).datepicker('show');
                });
            }).bind(self);
            $('#postponedToInstrumentDate').focusin(_showInstrumentDatepicker);

            var _methods = {
                onCloseToInsrumentDate: function () {
                    $('#postponedToInstrumentDate').off('.focusin').focusin(_showInstrumentDatepicker);
                }
            };
            $.extend(self, _methods);
        },
    };
    self.postponedFirePrices = new PostponedFirePriceCollectionViewModel();

    self.onPreAddPostponedFirePrice = function () {
        var editing = self.postponedFirePrices.editing;
        self.postponedFirePrices.isEdit(false);
        $.each(Object.getOwnPropertyNames(editing), function (i, prop) {
            if (ko.isObservable(editing[prop])) editing[prop]('');
            else editing[prop] = null;
        });
        editing.fromInstrument(_getFromInstrumentDefault());
        $("#FromInstrument").select2("val", editing.fromInstrument());
        editing.fromInstrumentDate(commonModels.findInstrument(editing.fromInstrument()));
        editing.weight(self.postponedFirePriceInfo.AvailableWeight);
        editing.note('延期费由买受方承担。\n成交价=点价基价+升贴水+延期费用');
        editing.code();
        $('#EditPostponedFirePriceModal').modal('show');
    };
    function _getFromInstrumentDefault() {
        var result = 0, postponedFirePrices = self.postponedFirePrices._internal();

        if (postponedFirePrices.length) {
            $.each(postponedFirePrices, function (i, item) {
                if (item.toInstrument() > result) result = item.toInstrument();
            });
            return result;
        } else {
            return route.values.instrumentId;
        }
    }
    self.onPreEditPostponedFirePrice = function (item) {
        self.postponedFirePrices.isEdit(true);
        self.postponedFirePrices.setCurrent(item);
        var editing = self.postponedFirePrices.editing;
        editing.fromInstrumentDate(commonModels.findInstrument(editing.fromInstrument()));
        editing.toInstrumentDate(commonModels.findInstrument(editing.toInstrument()));

        $('#EditPostponedFirePriceModal').modal('show');
    };
    self.onDeletePostponedFirePrice = function (elem) {
        self.postponedFirePrices.delete(elem, function (isDefered) {
            base._get(options.getPostponeInformationByIdUrl, { detailId: self.priceDetailId }, function (result) {
                self.postponedFirePriceInfo.IsPostponed(result.Data.IsPostponed);
                self.postponedFirePriceInfo.PostponeFine = result.Data.PostponeFine;
                self.postponedFirePriceInfo.AvailableWeight = result.Data.AvailableWeight;
                self.postponedFirePriceInfo.InstrumentId = result.Data.InstrumentId;
            });
        });
    };
    self.afterSave = function (event) {
        self.isPostponedFire(true);
        if ($(event.currentTarget).text() == '保存') {
            $('#EditPostponedFirePriceModal').modal('hide');
        } else {
            self.onPreAddPostponedFirePrice();
        }
        base._get(options.getPostponeInformationByIdUrl, { detailId: self.priceDetailId }, function (result) {
            self.postponedFirePriceInfo.IsPostponed(result.Data.IsPostponed);
            self.postponedFirePriceInfo.PostponeFine = result.Data.PostponeFine;
            self.postponedFirePriceInfo.AvailableWeight = result.Data.AvailableWeight;
            self.postponedFirePriceInfo.InstrumentId = result.Data.InstrumentId;
        });
    };
    self.onSavePostponedFirePrice = function (item, event) {
        self.postponedFirePrices.save(self.afterSave.bind(this, event));
    };
    self.onSavePostponedFirePriceAndToggle = function (item, event) {
        self.postponedFirePrices.save(function () {
            self.afterSave(event);
            var temp = self.firstSavePostponedFirePriceConfirmText();
            self.firstSavePostponedFirePriceConfirmText(self.secondSavePostponedFirePriceConfirmText());
            self.secondSavePostponedFirePriceConfirmText(temp);
        });
    };
    self.onSavePostponedFirePriceAndApplyApprove = function () {
        self.postponedFirePrices.save(function (result) {
            if (result.data.approvable) {
                window.location.href = route.requestCreateUrl + '?' + $.param({
                    objectId: result.data.id,
                    flowType: commonModels.Enums.ApprovalType.FirePricePostponeConfirm,
                    commodityId: self.contract.CommodityId,
                    redirect: 'FirePrice/Index?detailId=' + self.priceDetailId + '#tabPostponedFpc'
                });
            } else {
                var dialogClosed = false;
                var dialog = utils.alert('保存成功，此单据不支持审批。', function () {
                    if (!dialogClosed) {
                        dialogClosed = true;
                        dialog.close();
                        self.afterSave(event);
                    }
                });
                //setTimeout(dialog.ok, 3000);
            }
        });
    };
    self.firstSavePostponedFirePriceConfirmText = ko.observable('保存');
    self.secondSavePostponedFirePriceConfirmText = ko.observable('保存并继续');

};

GMK.Contract.FirePrice.FirePriceViewModel = function (commonModels, route, options, postponedFirePriceInfo) {
    var self = $.extend(this, commonModels);
    self.isEditing = ko.observable(false);
    self.values = route.values;
    // self.contractId = route.values.contractId;
    self.priceDetailId = route.values.priceDetailId;
    self.priceDetail = route.values.priceDetail;
    self.firePrice = self.priceDetail ? self.priceDetail.WFFirePriceDetail : null;
    self.isPricingTypeChange = ko.observable(false);
    self.haveSwap = ko.observable(false);
    self.pricingTypes = ko.observableArray();
    self.instrumentDate = ko.observable();
    self.instrumentType = ko.observable(commonModels.Enums.InstrumentType.Continuous);

    self.isForeignExchange = commonModels.isForeignExchange(self.firePrice.PriceMarket);
    self.firstInit = true;
    self.rootUnPricedWeight = null;
    
    var base = GMK.Features.FeatureBase;
    self.item = ko.observable();
    self.editingItem = null;
    self.initialize = function (isEditing, editingItem ,unPricedWeight) {
        self.isEditing(isEditing);
        if (self.isEditing()) {
            self.editingItem = editingItem;
            self.item(new GMK.Contract.FirePrice.RecordItemViewModel(ko.mapping.toJS(editingItem), function () {
                return self.firePrice.IsBuyerFire;
            }));
            var instrument = commonModels.findById(commonModels.AllInstruments(), editingItem.InstrumentId());
            if (instrument) {
                self.instrumentType(instrument.instrumentType);
                if (self.isForeignExchange && self.instrumentType() == commonModels.Enums.InstrumentType.Normal) {
                    self.instrumentDate(instrument.code);
                }
            }
        } else {
            self.item(_contructNewItem());
            if (postponedFirePriceInfo.IsPostponed()) self.item().InstrumentId(postponedFirePriceInfo.InstrumentId);
            self.item().IsDefered(postponedFirePriceInfo.IsPostponed());
            self.item().DeferedFee(postponedFirePriceInfo.PostponeFine);            
        }
        utils.formatDecimal();
        if (self.firstInit)
            self.baseInit();
        self.rootUnPricedWeight = unPricedWeight;
    };
    var commodityTypeId = (utils.find(commonModels.AllCommodities, function (r) {
        return r.id === route.values.commodityId;
    }) || {}).commodityTypeId;
    self.instruments = ko.computed(function () {
        var result;
        if (self.item() && self.item().FireDate() != null) {
            if (commonModels.isForeignExchange(self.firePrice.PriceMarket) && self.instrumentType() == commonModels.Enums.InstrumentType.Continuous) {
                result = $.grep(commonModels.AllInstruments(), function (instrument) {
                    return instrument.instrumentType === self.instrumentType() && instrument.exchangeId == self.firePrice.PriceMarket
                    && (self.item().PricingType() == commonModels.Enums.PricingType.DynamicPrice ? instrument.code === '3M' : (instrument.code === 'Cash' || instrument.code === '3M'));
                });
            } else {
                if (commodityTypeId && self.firePrice.PriceMarket) {
                    result = $.grep(commonModels.AllInstruments(), function (instrument) {
                        return instrument.exchangeId == self.firePrice.PriceMarket && instrument.commodityTypeId == commodityTypeId
                            && utils.compareDate(instrument.lastTradingDay, self.item().FireDate());
                    });
                } else {
                    result = [];
                }
            }
        }
        return result;
    });

    function _contructNewItem() {
        var item = new GMK.Contract.FirePrice.RecordItemViewModel(route.values.newItem, function () {
            return self.firePrice.IsBuyerFire;
        });
        item.WFPriceDetailId(self.priceDetailId);
        item.WFPriceDetail(self.priceDetail);
        //item.WFContractInfoId(self.contractId);
        item.InstrumentId(route.values.instrumentId);
        item.FireDate(moment().zone('+08:00').startOf('day').toJSON());
        item.PremiumDiscount(route.values.premiumDiscount || '');
        item.CurrencyId(self.priceDetail.WFPriceInfo.CurrencyId ? self.priceDetail.WFPriceInfo.CurrencyId : null);
        item.UnitId(self.priceDetail.WFPriceInfo.UnitId ? self.priceDetail.WFPriceInfo.UnitId : null);
        return item;
    }
    self.firstSaveFirePriceText = ko.observable('保存');
    self.secondSaveFirePriceText = ko.observable('保存并继续');
    function _save(item, event, callback) {
        var plainItem = ko.mapping.toJS(self.item);
        if (self.isEditing()) {
            if ((utils.parseFloat(self.rootUnPricedWeight) + utils.parseFloat(self.editingItem.Weight())) - utils.parseFloat(plainItem.Weight) < 0)
                confirm('当前点价重量超过了未点价总量，确认提交？', function () {
                    _saveWithOutRise(item, event, callback);
                }, function () {
                    return false;
                });
            else
                _saveWithOutRise(item, event, callback);
        } else {
            if (utils.parseFloat(self.rootUnPricedWeight) - utils.parseFloat(plainItem.Weight) < 0)
                confirm('当前点价重量超过了未点价总量，确认提交？', function () {
                    _saveWithOutRise(item, event, callback);
                }, function () {
                    return false;
                });
            else
                _saveWithOutRise(item, event, callback);
        }
    }
    function _saveWithOutRise(item, event, callback) {
        var plainItem = ko.mapping.toJS(self.item);
        if (self.isForeignExchange && self.instrumentType() == commonModels.Enums.InstrumentType.Normal) {
            if (self.instrumentDate() != null) {
                var instrument = commonModels.findDateCodeInstrument(self.instrumentDate());
                if (instrument)
                    plainItem.InstrumentId = instrument.id;
                else {
                    alert('相关合约暂未设置，请联系管理员。'); return false;
                }
            }
        }
        base._post(self.isEditing() ? options.editUrl : options.createUrl, plainItem, function (result) {
            route.loadItems();
            //if (!self.isEditing() && route.addCallback) {
            //    route.addCallback(new GMK.Contract.FirePrice.RecordItemViewModel(result.Data));
            //} else {
            //    ko.mapping.fromJS(ko.mapping.toJS(self.item()), self.editingItem);
            //}
            if ($(event.currentTarget).text() == '保存') $(event.currentTarget).closest('.modal').modal('hide');
            else self.initialize(false);
            if (callback) callback(item, event);
            base._get(options.getPostponeInformationByIdUrl, { detailId: self.priceDetailId }, function (result) {
                postponedFirePriceInfo.IsPostponed(result.Data.IsPostponed);
                postponedFirePriceInfo.PostponeFine = result.Data.PostponeFine;
                postponedFirePriceInfo.AvailableWeight = result.Data.AvailableWeight;
                postponedFirePriceInfo.InstrumentId = result.Data.InstrumentId;
            });
        });
    }
    self.onSave = function (item, event) {
        _save(item, event);
    };
    self.onSaveAndToggle = function (item, event) {
        _save(item, event, function (item, event) {
            var temp = self.firstSaveFirePriceText();
            self.firstSaveFirePriceText(self.secondSaveFirePriceText());
            self.secondSaveFirePriceText(temp);
        });
    };

    self._init = function (commonModels) {
        var base = GMK.Features.FeatureBase;
        var _untradableDaysCache = {};
        var _lastKey;
        function _getUntradableDays(exchangeId, startDate, callback) {
            var key = exchangeId + '_' + startDate.valueOf();
            if (_lastKey == key) {
                $('#InstrumentDate').datepicker('show');
                return;
            }
            _lastKey = key;
            if (_untradableDaysCache[key]) {
                callback(_untradableDaysCache[key]);
            }
            base._get("Contract/GetUntradableDays", { exchangeId: exchangeId, startDate: utils.formatDate(startDate) }, function (result) {
                result.data = $.map(result.data, function (d) {
                    return moment(d).toDate();
                });
                _untradableDaysCache[key] = result.data;
                callback(result.data);
            });
        }
        var _showInstrumentDatepicker = (function () {
            _getUntradableDays(self.firePrice.PriceMarket, moment(self.item().FireDate()).startOf('d').toDate(), function (data) {
                $('#InstrumentDate').datepicker('option', 'minDate', utils.parseDate(moment(self.item().FireDate()).startOf('d').toDate()));
                $('#InstrumentDate').datepicker('option', 'disabledDates', data).datepicker('show');
                //setTimeout(function () { $('#InstrumentDate').datepicker('show'); }, 100);
            });
        }).bind(self);
        $('#InstrumentDate').focusin(_showInstrumentDatepicker);
        $('#InstrumentDate').datepicker('option', 'minDate', utils.parseDate(self.firePrice.FireStartDate));


        var _methods = {
            onCloseInsrumentDate: function () {
                $('#InstrumentDate').off('.focusin').focusin(_showInstrumentDatepicker);
            },
            onSelectPriceDate: ko.computed(function () {
                if (self.item().FireDate() != null) {
                    $('#InstrumentDate').datepicker('option', 'minDate', utils.parseDate(self.item().FireDate()));
                    $('#InstrumentDate').off('.focusin').focusin(_showInstrumentDatepicker);
                }
                else {
                    $('#InstrumentDate').unbind('focusin');
                    self.instrumentDate(null);
                }
            }),
        };
        $.extend(self, _methods);
    };
    self.baseInit = function () {
        if (self.firePrice != null) { //外贸
            if (self.isForeignExchange) {
                self.isPricingTypeChange(self.firePrice.PricingType == commonModels.Enums.PricingType.None);
                self.haveSwap(self.firePrice.IsSwap);
                var types = $.grep(commonModels.EnumOptions.PricingType, function (r) {
                    return r.value == commonModels.Enums.PricingType.DynamicPrice || r.value == commonModels.Enums.PricingType.SettlementPrice;
                });
                self.pricingTypes(types);
                if (!self.firePrice.PricingType == commonModels.Enums.PricingType.None) {
                    self.item().PricingType(self.firePrice.PricingType);
                }
            }
        }
        self._init(commonModels);
    }
};

GMK.Contract.FirePrice.CreateFpcViewModel = function (commonModels, route, options) {
    var self = $.extend(this, commonModels);
    self.values = route.values;
    self.priceDetailId = route.values.priceDetailId;
    self.priceDetail = route.values.priceDetail;
    self.firePrice = self.priceDetail ? self.priceDetail.WFFirePriceDetail : null;

    var base = GMK.Features.FeatureBase;
    //self.item = null;
    self.item = new GMK.Contract.FirePrice.ConfirmItemViewModel(route.fpc);
    self.item.WFPriceDetailId(self.priceDetailId);
    self.item.WFPriceDetail(self.priceDetail);
    self.fprs = ko.observableArray();
    self.initialize = function () {
        base._get(options.notconfirmedUrl, { detailId: self.priceDetailId }, function (result) {
            if (result.Status === true) {
                self.fillNotconfirmed(result.Data);
            }
        });
    };
    self.fillNotconfirmed = function (data) {
        var mapped = ko.mapping.fromJS(data);
        self.fprs(mapped());
    };
    self.save = function (callback) {
        var plainItem = ko.mapping.toJS(self.item);
        plainItem.WFFirePriceRecords = [];
        var plainFprs = ko.mapping.toJS(self.fprs);
        for (var i = 0, l = plainFprs.length; i < l; i++) {
            if (plainFprs[i].IsConfirmed === true) {
                plainItem.WFFirePriceRecords.push(plainFprs[i]);
            }
        }
        if (plainItem.WFFirePriceRecords.length > 1 && self.firePrice && commonModels.isForeignExchange(self.firePrice.PriceMarket)) {
            alert("您需要生成的点价确认函模板只能包含一条点价记录，请重新选择！");
        } else {
            base._post(options.saveUrl, plainItem, function (result) {
                callback(result);
            });
        }
    };
    self.back = function (result) {
        window.location.href = options.indexUrl + '?' + $.param({ detailId: self.priceDetailId }) + options.anchor;
    };
    self.onSave = function () {
        self.save(self.back);
    };
    self.onSaveAndPrint = function () {
        var win = utils.openWindow();
        self.save(function (result) {
            var printUrl = 'Template/ArchiveIndex?' + $.param({
                templateType: commonModels.Enums.BillTemplateType.FirePriceConfirmBill,
                dataSourceId: result.Data.WFFirePriceConfirmId
            });
            win.redirectTo(printUrl);
            window.location.href = options.indexUrl + '?' + $.param({ detailId: self.priceDetailId }) + options.anchor;
        });
    };

    self.onSaveAndReqestApprove = function () {
        self.save(function (result) {
            if (result.Data.approvable) {
                location.href = route.requestCreateUrl + '?' + $.param({
                    objectId: result.Data.WFFirePriceConfirmId,
                    flowType: commonModels.Enums.ApprovalType.FirePriceConfirmBill,
                    redirect: 'FirePrice/Index?' + $.param({ detailId: self.priceDetailId }) + options.anchor
                });
            } else {
                utils.alert('保存成功，此单据不支持审批。', self.back);
                //setTimeout(self.back, 3000);
            }
        });
    };

    self.checkedAll = ko.observable(false);
    self.checkedAllComputed = ko.computed({
        read: self.checkedAll,
        write: function (value) {
            self.checkedAll(value);
            $.each(self.fprs(), function (i, r) {
                r.IsConfirmed(value);
            });
        }
    });
    self.onCheckAll = function () {
        var checkedAll = self.checkedAll();
        $.each(self.fprs(), function (i, r) {
            r.IsConfirmed(checkedAll);
        });
    };
};

GMK.Contract.FirePrice.EditFpcViewModel = function (commonModels, route, options) {
    var self = $.extend(this, commonModels);
    self.values = route.values;
    self.priceDetailId = route.values.priceDetailId;
    self.priceDetail = route.values.priceDetail;
    self.firePrice = self.priceDetail ? self.priceDetail.WFFirePriceDetail : null;

    var base = GMK.Features.FeatureBase;
    //self.item = null;
    self.item = new GMK.Contract.FirePrice.ConfirmItemViewModel(route.fpc);
    self.fprs = ko.observableArray((ko.mapping.fromJS(route.fpc.WFFirePriceRecords))());
    self.initialize = function () {
        base._get(options.notconfirmedUrl, { detailId: self.priceDetailId }, function (result) {
            if (result.Status === true) {
                self.fillNotconfirmed(result.Data);
            }
        });
    };
    self.fillNotconfirmed = function (data) {
        for (var i = 0, l = data.length; i < l; i++) {
            self.fprs.push(ko.mapping.fromJS(data[i]));
        }
    };
    self.save = function (callback) {
        var plainItem = ko.mapping.toJS(self.item);
        plainItem.WFFirePriceRecords = [];
        var plainFprs = ko.mapping.toJS(self.fprs);
        for (var i = 0, l = plainFprs.length; i < l; i++) {
            if (plainFprs[i].IsConfirmed === true) {
                plainItem.WFFirePriceRecords.push(plainFprs[i]);
            }
        }
        base._post(options.saveUrl, plainItem, function (result) {
            callback(result);
        });
    };
    self.back = function (result) {
        window.location.href = options.indexUrl + '?' + $.param({ detailId: self.priceDetailId }) + options.anchor;
    };
    self.onSave = function () {
        self.save(self.back);
    };
    self.onSaveAndPrint = function () {
        var win = utils.openWindow();
        self.save(function (result) {
            var printUrl = 'Template/ArchiveIndex?' + $.param({
                templateType: commonModels.Enums.BillTemplateType.FirePriceConfirmBill,
                dataSourceId: result.Data.WFFirePriceConfirmId
            });
            win.redirectTo(printUrl);
            window.location.href = options.indexUrl + '?' + $.param({ detailId: self.priceDetailId }) + options.anchor;
        });
    };

    self.onSaveAndReqestApprove = function () {
        self.save(function (result) {
            if (result.Data.approvable) {
                location.href = route.requestCreateUrl + '?' + $.param({
                    objectId: result.Data.WFFirePriceConfirmId,
                    flowType: commonModels.Enums.ApprovalType.FirePriceConfirmBill,
                    redirect: 'FirePrice/Index?' + $.param({ detailId: self.priceDetailId }) + options.anchor
                });
            } else {
                utils.alert('保存成功，此单据不支持审批。', self.back);
                //setTimeout(self.back, 3000);
            }
        });
    };

    self.checkedAll = ko.observable(false);
    self.checkedAllComputed = ko.computed({
        read: self.checkedAll,
        write: function (value) {
            self.checkedAll(value);
            $.each(self.fprs(), function (i, r) {
                r.IsConfirmed(value);
            });
        }
    });
    self.onCheckAll = function () {
        var checkedAll = self.checkedAll();
        $.each(self.fprs(), function (i, r) {
            r.IsConfirmed(checkedAll);
        });
    };
};

GMK.Contract.FirePrice.DetailsFpcViewModel = function (commonModels, route, options) {
    var self = $.extend(this, commonModels);
    self.values = route.values;
    self.contractId = route.values.contractId;
    var base = GMK.Features.FeatureBase;

    self.item = ko.observable();
    self.item(route.fpc);
    self.initialize = function () {
    };
};
