"use strict";
var ns = utils.namespace('GMK.Contract.SimpleContracts');

ns.start = function (route) {
    GMK.Features.CommonModels.onReady(function (models) {
        var options = {
            loadUrl: 'Contract/Get',
            saveUrl: 'Contract/Save',
            generateContractCodeUrl: 'Contract/GenerateContractCode',
            getEditablePropertiesUrl: 'Contract/GetEditableProperties',
            getSpotAmountTypeUrl: 'Contract/GetSpotAmountType',
            saveConnectedContractUrl: 'Contract/SaveConnectedContract',
            getUntradableDaysUrl: 'Contract/GetUntradableDays',
            loadKey: route.key || 0,
            isCopied: route.isCopied,
            isDeclaring: route.isDeclaring,
            isSeries: route.isSeries,
            isPledge: route.isPledge,
            isRedeem: route.isRedeem,
            pledgeContractId: route.pledgeContractId,
            longContractInfoId: route.longContractInfoId,
            tradeType: route.tradeType,
            listUrl: route.listUrl,
            newDetail: route.newDetail,
            newDeliveryContract: route.newDeliveryContract,
            corporationId: route.corporationId,
            isDeliver: route.isDeliver,
            isConnectedTranslation: route.isConnectedTranslation,
            connectedContract: route.connectedContract,
            archiveIndexUrl: route.archiveIndex,
            requestCreateUrl: route.requestCreate,
            deliverContractUrl: route.deliverContract,
            indexUrl: route.index,
            pledgeContractIndexUrl: route.pledgeContractIndex,
            sodData: route.sodData,
            sodEpCrData: route.sodEpCrData,
            sodEpLcData: route.sodEpLcData,
            sodEpDpData: route.sodEpDpData,
            sodEpDaData: route.sodEpDaData,
        };
        var viewModel;
        if (options.isConnectedTranslation) {
            viewModel = new ns.ConnectedContractViewModel();
        } else if (options.isDeliver) {
            viewModel = new ns.DeliveryContractViewModel();
        } else if (options.isSeries) {
            viewModel = new ns.LongContractSeriesViewModel();
        } else if (options.isPledge) {
            viewModel = new ns.PledgeContractViewModel();
        } else {
            viewModel = new ns.CommodityContractViewModel();
        }
        viewModel._init(models, options);
        viewModel.initialize();
        ko.applyBindings(viewModel);

        $("#addCommodityForm").validate({
            rules: {
                'BrandId': {
                    required: {
                        depends: function () {
                            return viewModel.priceMakingType() == models.Enums.PriceMakingType.FixPrice;
                        }
                    }
                }
            }
        });
        $('#firePriceForm').validate({
            rules: {
                'InstrumentId': {
                    required: function () {
                        var exchange = viewModel.priceDetail.selectedExchange();
                        return exchange && (exchange.type != (models.Enums.CorporationTypeFlag.Client & models.Enums.CorporationTypeFlag.Exchange));
                    }
                }
            }
        });
        setLabel();
    });
};

/**
    *合同超类
    *@构造函数
    */
ns.BaseContractViewModel = function () {
    var self = this;
    this.contractDetails = ko.observableArray();
    this.editingDetailIndex = ko.observable(-1);
    this.pricingTypeReady = ko.observable(false);
    this.brands = ko.observableArray();
    this.specifications = ko.observableArray();

    this.selectedSignDate = ko.observable(null);
    this.selectedCommodity = ko.observable();
    this.selectedSalerId = ko.observable();
    this.selectedAccountEntityId = ko.observable();

    this.selectedDepartmentId = ko.observable();
    this.unitId = ko.observable();
    this.exchangeId = ko.observable();
    this.selectedExchange = ko.observable();
    this.firePriceSummary = ko.observable(null);

    this.customerId = ko.observable();
    this.isBuy = ko.observable('False');
    this.spotAmountType = ko.observable();
    this.approvalStatus = ko.observable();
    this.currencyId = ko.observable();
    this.currencyDisabled = ko.observable(false);

    this.checkQuotaMessage = ko.observable();
    this.checkQuotaOverquota = ko.observableArray();
    this.checkQuotaLink = ko.observable({});

    this.ignoerPeriodNotEqualRisk = ko.observable(false);
    this.isEdit = ko.observable(false);
    this.isAddOrRemoveContractDetailEnabled = ko.observable(true);
    this.isEditContractDetailEnabled = ko.observable(true);
    this._cache = {};
    this.bucket = {
        _wfPriceInfoId: null,
        _wfPriceDetailId: null,
        _isInitialized: false,
        customShowErrors: ko.observable(),
        _muteChange: false
    };
    this.priceDetail = {
        wfPriceDetailId: ko.observable(),
        startAndEndDate: ko.observable(),
        priceMarket: ko.observable(),
        dayCount: ko.observable(),
        tempPrice: ko.observable(),

        // 点价
        priceCalcType: ko.observable(),
        isBuyerFire: ko.observable(true + ''),
        instrumentId: ko.observable(),
        instrumentDate: ko.observable(),
        marginRate: ko.observable(),
        pricingType: ko.observable(),
        isSwap: ko.observable("false"),

        // 均价
        priceCalculateType: ko.observable(),
        settlementPriceType: ko.observable(),
        instrumentText: ko.observable(),
        continuousInstrument: ko.observable(),        
        resetFirePrice: function () {
            this.isBuyerFire(true + '');
            this.instrumentId(null);
            this.marginRate(null);
            this.priceCalcType(null);
            this.instrumentDate(null);
            this.pricingType(null);
            this.isSwap("false");
        },
        resetAvgPrice: function () {
            this.priceCalculateType(null);
            this.settlementPriceType(null);
            this.instrumentText(null);
        },
        resetCommon: function () {
            this.startAndEndDate(null);
            this.priceMarket(null);
            this.dayCount(null);
            this.tempPrice(null);
        },
        reset: function () {
            this.resetCommon();
            this.resetFirePrice();
            this.resetAvgPrice();
        },
        toFirePrice: function () {
            var result = ko.mapping.toJS(this, {
                ignore: ['startAndEndDate', 'tempPrice', 'priceCalculateType',
                    'settlementPriceType', 'instrumentText'].concat(this._getComputeds())
            });
            var splitting = (this.startAndEndDate() || '').split(' ');
            result.fireStartDate = splitting[0];
            result.fireEndDate = splitting[2];
            result.isBuyerFire = result.isBuyerFire === 'true';
            result.isSwap = result.isSwap === 'true';
            return result;
        },
        toAvgPrice: function () {
            var _this = this;
            var result = ko.mapping.toJS(this, {
                ignore: ['startAndEndDate', 'priceCalcType', 'isBuyerFire', 'instrumentId', 'instrumentDate',
                     'marginRate', 'tempPrice', 'instrumentText', 'isSwap', 'pricingType'].concat(this._getComputeds())
            });
            var splitting = (this.startAndEndDate() || '').split(' ');
            result.startTime = splitting[0];
            result.endTime = splitting[2];
            return result;
        },
        _getComputeds: function () {
            var _this = this;
            if (!self._cache['__price_detail_computeds']) {
                self._cache['__price_detail_computeds'] = $.grep(Object.getOwnPropertyNames(this), function (prop) {
                    return ko.isComputed(_this[prop]);
                });
            }
            return self._cache['__price_detail_computeds'];
        },
        restore: function (jsObj) {
            var _this = this;
            jsObj.isBuyerFire = jsObj.isBuyerFire + ''; // in case isBuyerFire is boolean
            jsObj.isSwap = jsObj.isSwap + '';
            var properties = $.grep(Object.getOwnPropertyNames(this), function (prop) {
                return !ko.isComputed(_this[prop]) && ko.isObservable(_this[prop]);
            });
            self.bucket._muteChange = true;
            ko.mapping.fromJS(jsObj, { include: properties }, this);
            self.bucket._muteChange = false;
        },
        backup: function () {
            var self = this;
            var properties = $.grep(Object.getOwnPropertyNames(this), function (prop) {
                return ko.isComputed(self[prop]) || !ko.isObservable(self[prop]);
            });
            return ko.mapping.toJS(this, { ignore: properties });
        }
    };
    this.priceDetail.continuousInstruments = ko.computed(function () {
        return self._inited() && self.commonModels && self.commonModels.listInstruments({
            commodityId: self.selectedCommodity(),
            exchangeId: self.priceDetail.priceMarket(),
            instrumentType: self.commonModels.Enums.InstrumentType.Continuous
        }) || [];
    });

    this.invalids = {
        contract: ko.observable(0),
        detail: ko.observable(0),
        fireprice: ko.observable(0),
        avgPrice: ko.observable(0),
        setPrice: ko.observable(0),
        commonPayment: ko.observable(0),
        dpPayment: ko.observable(0),
        lcPayment: ko.observable(0),
        crPayment: ko.observable(0),
        daPayment: ko.observable(0),
    };
    this.setCustomShowErrors = {
        contract: function () { self.bucket.customShowErrors(self.invalids.contract); },
        detail: function () { self.bucket.customShowErrors(self.invalids.detail); },
        fireprice: function () { self.bucket.customShowErrors(self.invalids.fireprice); },
        avgPrice: function () { self.bucket.customShowErrors(self.invalids.avgPrice); },
        setPrice: function () { self.bucket.customShowErrors(self.invalids.setPrice); },
        commonPayment: function () { self.bucket.customShowErrors(self.invalids.commonPayment); },
        dpPayment: function () { self.bucket.customShowErrors(self.invalids.dpPayment); },
        lcPayment: function () { self.bucket.customShowErrors(self.invalids.lcPayment); },
        crPayment: function () { self.bucket.customShowErrors(self.invalids.crPayment); },
        daPayment: function () { self.bucket.customShowErrors(self.invalids.daPayment); }
    };
};
ns.BaseContractViewModel.prototype = {
    _inited: ko.observable(false),
    /**
        *对象初始化函数，当对象生成之后第一个调用的函数
        *@param {object} models - common model对象
        *@param {object} options - 一些用户指定的额外参数
        */
    _init: function (models, options) {
        this.commonModels = models;
        $.extend(this, models);
        /*******************private properties*****************/
        var base = GMK.Features.FeatureBase;
        this._backupPriceDetail = null;
        /*******************private properties*****************/

        /*******************extra properties*****************/
        this.internaltionalTradeTypes = $.grep(models.EnumOptions.TradeType, function (item) {
            return item.value != models.Enums.TradeType.Domestic;
        });
        this.settleOptionViewModel = new GMK.Contract.SettleOptionViewModel();
        this.settleOptionViewModel.init(options, null, models, models.Enums.OptionType.Simple);
        this.priceMakingType = ko.observable(models.Enums.PriceMakingType.FixPrice);
        this.newDetail = ko.mapping.fromJS(options.newDetail);
        this.selectedCorporation = function () {
            //for (var i = 0; i < this.AllCorporations.length; i++) {
            //    var corporation = this.AllCorporations[i];
            //    if (corporation.id.toString() == options.corporationId.toString()) {
            //        return corporation;
            //    }
            //}
            return models._findCompany(+options.corporationId);
        };
        this.availableBusinessDepartments = ko.computed(function () {
            var self = this;
            return $.map($.grep(models.AllCommodities, function (r) {
                return self.selectedCommodity() === r.id;
            }), function (r) {
                return r.businessDepartments || [];
            });
        }, this);
        this.availableAccountEntities = ko.computed(function () {
            var self = this;
            return $.map($.grep(self.availableBusinessDepartments(), function (r) {
                return self.selectedDepartmentId() === r.id;
            }), function (r) {
                return r.accountEntities || [];
            });
        }, this);
        this.availableSalers = ko.computed(function () {
            var self = this;
            return $.map($.grep(self.availableBusinessDepartments(), function (r) {
                return self.selectedDepartmentId() === r.id;
            }), function (r) {
                return r.salers || [];
            });
        }, this);
        this.priceDetail.isSpotPriceMakingMarket = ko.computed(function () {
            var exchange = models.findById(models._AllExchanges, this.priceDetail.priceMarket());
            return exchange && (exchange.type & models.Enums.CorporationTypeFlag.SpotPriceMakingMarket);
        }, this);
        this.priceDetail.selectedExchange = ko.computed(function () {
            return models.findById(models._AllExchanges, this.priceDetail.priceMarket());
        }, this);
        this.settlementPriceTypes = ko.computed(function () {
            return this.priceDetail.isSpotPriceMakingMarket()
                ? $.grep(models.EnumOptions.SettlementPriceType, function (r) {
                    return r.text == '当日';
                })
                : models.EnumOptions.SettlementPriceType;
        }, this);
        this.Instruments = ko.computed(function () {
            var exchangeId = this.priceDetail.priceMarket();
            var commodityId = this.selectedCommodity();
            var signDate = this.selectedSignDate();
            var commodityTypeId;
            if (commodityId && exchangeId && signDate) {
                commodityTypeId = models.findById(models.AllCommodities, commodityId).commodityTypeId;
                return $.grep(models.AllInstruments(), function (instrument) {
                    return instrument.exchangeId == exchangeId && instrument.commodityTypeId == commodityTypeId
                     && utils.compareDate(instrument.lastTradingDay, signDate);
                });
            } else {
                return [];
            }
        }, this);
        this.isFixPriceDisable = ko.computed(function () {
            var v1 = this.contractDetails().length, v2 = (this.priceMakingType() != models.Enums.PriceMakingType.FixPrice);
            return v1 && (v2 || options.isDeclaring);
        }, this);
        this.isFirePriceDisable = ko.computed(function () {
            var v1 = this.contractDetails().length, v2 = this.priceMakingType() != models.Enums.PriceMakingType.FirePrice,
                    v3 = options.isDeclaring ? (this.priceMakingType() != models.Enums.PriceMakingType.Undeclared) : true;
            return v1 && (v2 && v3);
        }, this);
        this.isAvgPriceDisable = ko.computed(function () {
            var v1 = this.contractDetails().length, v2 = this.priceMakingType() != models.Enums.PriceMakingType.AvgPrice,
                    v3 = options.isDeclaring ? (this.priceMakingType() != models.Enums.PriceMakingType.Undeclared) : true;
            return v1 && (v2 && v3);
        }, this);
        this.isComplexPriceDisable = ko.computed(function () {
            var v1 = this.contractDetails().length, v2 = this.priceMakingType() != models.Enums.PriceMakingType.ComplexPrice,
                    v3 = options.isDeclaring ? (this.priceMakingType() != models.Enums.PriceMakingType.Undeclared) : true;
            return v1 && (v2 && v3);
        }, this);
        this.isUndelarePriceDisable = ko.computed(function () {
            var v1 = this.contractDetails().length, v2 = this.priceMakingType() != models.Enums.PriceMakingType.Undeclared;
            return v1 && v2;
        }, this);
        this._registerSubscribers(models);
        /*******************extra properties end*****************/

        /*******************private methods*****************/
        utils.setCustomShowErrors(this.bucket.customShowErrors);
        function saveWithRisk(ignoreRisk, ignorePeriodRisk, param, callback) {
            var self = this;
            if (ignoreRisk === true) param.IgnoreRisk = true;
            if (ignorePeriodRisk === true) param.IgnorePeriodRisk = true;
            base._post(options.saveUrl, param, function (result) {
                if (result.returnStatus == models.Enums.ReturnStatus.Warning) {
                    if (result.extraData == "PeriodWarning") {
                        var periodWarning = "";
                        $.each(result.data, function (i, msg) {
                            if (msg.type == models.Enums.PotentialRiskCategory.AccountPeriod) {
                                periodWarning += "<strong class='text-danger'>本合同存在账期风险，确认提交？</strong><br />";
                            }
                            if (msg.type == models.Enums.PotentialRiskCategory.SpotFirst) {
                                periodWarning += "<strong class='text-danger'>本合同为先货后款的销售合同，存在风险，确认提交？</strong><br />";
                            }
                        });
                        confirm(periodWarning, function () {
                            self.save(false, true, callback);
                        });
                    } else {
                        self.checkQuotaMessage(result.message);
                        self.checkQuotaOverquota(result.data.overquota || []);
                        self.checkQuotaLink({ key: result.extraData });
                        var msg = $('#checkQuotaResult').html();
                        confirm(msg, function () {
                            self.save(true, true, callback);
                        });
                    }
                } else {
                    if (callback) callback(result);
                }
            });
        };
        /*******************private methods end*****************/

        /*******************public methods*****************/
        var _methods = {
            /**
                *生成合同编号
                */
            onGenerateContractCode: function (item, event) {
                base._get(options.generateContractCodeUrl, {
                    isBuy: this.isBuy(),
                    commodityId: $("#CommodityId").val()
                }, function (data) {
                    var $contractCodeElem = $(event.currentTarget).prev().val(data.result);
                });
            },
            /**
                *在准备设置作价方式为“点价”之前调用，主要是做一些数据备份和初始化工作
                */
            onPreFirePriceSet: function () {
                this._backupPriceDetail = this.priceDetail.backup();
                if (this.priceMakingType() != models.Enums.PriceMakingType.FirePrice) {
                    this.priceDetail.reset();
                }
                if (!this.priceDetail.instrumentId()) {
                    var instrument = models.findInstrumentByDate(this.Instruments(), utils.formatDate(this.selectedSignDate()));
                    if (instrument) this.priceDetail.instrumentDate(instrument.endDate);
                }
            },
            /**
                *设置作价方式为“点价”
                */
            onFirePriceSet: function (item, event) {
                var _this = this;
                if (this.priceDetail.instrumentDate()) {
                    var instrument = models.findDateCodeInstrument(this.priceDetail.instrumentDate());
                    if (!instrument) {
                        alert('您选择的作价合约暂未设置，请联系管理员。'); return false;
                    }
                }
                this.priceMakingType(models.Enums.PriceMakingType.FirePrice);
                this._resetFirePriceSummary();
                $(event.currentTarget).closest('.modal').modal('hide');
                this._updateTempPrice(this.priceDetail.tempPrice());
                this.isEditContractDetailEnabled(false);
                this._setCurrency(this.priceDetail.priceMarket());
            },
            /**
                *根据作价市场决定币种以及币种是否可编辑
                */
            _setCurrency: function (priceMarket) {
                var item = models.findById(models._AllExchanges, priceMarket);
                if (item) {
                    this.currencyId(item.currencyId);
                    this.currencyDisabled(true);
                } else {
                    this.currencyDisabled(false);
                }
            },
            /**
                *撤销将作价方式设置为“点价”，主要是做一些数据恢复工作
                */
            onCancelPriceSet: function () {
                this.priceDetail.restore(this._backupPriceDetail);
            },
            /**
                *设置作价方式为“定价”
                */
            onFixPriceSet: function () {
                if (this.priceMakingType() == models.Enums.PriceMakingType.FixPrice) return;
                this.priceDetail.reset();
                this.priceMakingType(models.Enums.PriceMakingType.FixPrice);
                this.firePriceSummary(null);
                this.isEditContractDetailEnabled(true);
                this._setCurrency(null);
            },
            /**
                *在准备设置作价方式为“均价”之前调用，主要是做一些数据备份和初始化工作
                */
            onPreAvgPriceSet: function () {
                this._backupPriceDetail = this.priceDetail.backup();
                if (this.priceMakingType() == models.Enums.PriceMakingType.AvgPrice) return;
                this.priceDetail.reset();
            },
            /**
                *设置作价方式为“均价”
                */
            onAvgPriceSet: function () {
                this.priceMakingType(models.Enums.PriceMakingType.AvgPrice);
                $('#AvgPriceModal').modal('hide');
                this._updateTempPrice(this.priceDetail.tempPrice());
                this.isEditContractDetailEnabled(false);
                this._resetAvgPriceSummary();
                this._setCurrency(this.priceDetail.priceMarket());
            },
            /**
                *设置均价的概要
                */
            _resetAvgPriceSummary: function (v) {
                if (v !== undefined) {
                    this.firePriceSummary(v);
                    return;
                }
                var priceDetail = this.priceDetail;
                this.firePriceSummary('均价信息：（起止日期：{0}，市场：{1}）'.format(priceDetail.startAndEndDate(), models.findExchange(priceDetail.priceMarket())));
            },
            /**
                *设置点价的概要
                */
            _resetFirePriceSummary: function (v) {
                if (v !== undefined) {
                    this.firePriceSummary(v);
                    return;
                }
                var priceDetail = this.priceDetail;
                this.firePriceSummary("点价信息：（点价方：{0}，市场：{1}，计算方式：{2}，临时基价：{4}，保证金比例：{3}）".format(
                                    (priceDetail.isBuyerFire() === 'true') ? "客户" : "我方",
                                    models.findExchange(priceDetail.priceMarket()) + (priceDetail.instrumentId() ? "，合约：" + models.findInstrument(priceDetail.instrumentId()) : ""),
                                    models.findPriceType(priceDetail.priceCalcType()),
                                    priceDetail.marginRate(),
                                    priceDetail.tempPrice() ? utils.formatDecimal(priceDetail.tempPrice(), models.settings.decimalDigits) : '未设置'));
            },
            /**
                *设置作价方式，主要被“待宣告”，“复杂”调用
                */
            onPreSetPriceMakingType: function (priceMakingType) {
                this._backupPriceDetail = this.priceDetail.backup();
                if (this.priceMakingType() != priceMakingType) {
                    this.priceDetail.reset();
                }
                this._cache['__price_making_type'] = priceMakingType;
            },
            /**
                * 把合同明细的临时价更新为指定值
                * @param {number} tempPrice - 指定的临时价
                */
            _updateTempPrice: function (tempPrice) {
                var _this = this;
                $.each(this.contractDetails(), function (i, detail) {
                    detail.price(utils.formatDecimal(_this.priceDetail.tempPrice(), models.settings.decimalDigits));
                    detail.actualPrice(utils.formatDecimal(utils.parseFloat(detail.price()) + utils.parseFloat(detail.premiumDiscount()), models.settings.decimalDigits));
                });
            },
            /**
                * 设置作价方式为“待宣告”时调用
                */
            onSetPriceMakingType: function () {
                this.priceMakingType(this._cache['__price_making_type']);
                this._resetFirePriceSummary(null);
                $('#SetPriceModal').modal('hide');
                this._updateTempPrice(this.priceDetail.tempPrice());
                this._setCurrency(null);
            },
            /**
                * 设置作价方式为“复杂”时调用
                */
            onSetComplextPriceMakingType: function () {
                if (this.priceMakingType() == models.Enums.PriceMakingType.ComplexPrice) return;
                this.priceDetail.reset();
                this.priceMakingType(models.Enums.PriceMakingType.ComplexPrice);
                this.firePriceSummary(null);
                this.isEditContractDetailEnabled(false);
                this._updateTempPrice(this.priceDetail.tempPrice());
                this._setCurrency(null);
            },
            /**
                *在准备编辑明细之前调用
                */
            onToEditDetail: function (item) {
                var index = this.contractDetails.indexOf(item);
                this.editingDetailIndex(index);
                if (index > -1) {
                    ko.mapping.fromJS(ko.mapping.toJS(item), this.newDetail);
                } else {
                    ko.mapping.fromJS(options.newDetail, this.newDetail);
                }
                utils.formatDecimal();
            },
            /**
                *添加明细
                */
            onAddDetail: function (data, event) {
                var priceMakingTypeEnum = models.Enums.PriceMakingType;
                if (this.priceMakingType() == priceMakingTypeEnum.FixPrice) {
                    var premiumDiscount = parseFloat(this.newDetail.premiumDiscount());
                    var actualPrice = parseFloat(this.newDetail.actualPrice());
                    var price = utils.roundAmount(actualPrice - (premiumDiscount || 0));
                    this.newDetail.price(price);
                } else {
                    var price = parseFloat(this.priceDetail.tempPrice()) || '';
                    var premiumDiscount = parseFloat(this.newDetail.premiumDiscount());
                    var realDiscount = $.isNumeric(premiumDiscount) ? premiumDiscount : 0;
                    var actualPrice = $.isNumeric(price) ? utils.roundAmount(price + realDiscount) : null;
                    this.newDetail.price(price);
                    this.newDetail.actualPrice(actualPrice);
                }
                if (this.editingDetailIndex() > -1) {
                    var oldValue = this.contractDetails()[this.editingDetailIndex()];
                    var newValue = ko.mapping.fromJS(ko.mapping.toJS(this.newDetail));
                    this.contractDetails.replace(oldValue, newValue);
                } else {
                    var detail = ko.mapping.fromJS(ko.mapping.toJS(this.newDetail));
                    this.contractDetails.push(detail);
                }
                utils.formatDecimal();
                $(event.currentTarget).closest('.modal').modal('hide');
            },
            /**
                *删除明细
                */
            onRemoveDetail: function (detail) {
                this.contractDetails.remove(detail);
            },
            /**
                *ajax请求的参数填充点价信息
                */
            _handleFirePricing: function (data) {
                var dateStr = (this.priceDetail.startAndEndDate() || '').split(' ');
                if (!data.wfPriceInfo) data.wfPriceInfo = {
                    commodityId: this.selectedCommodity()
                };
                if (models.isForeignExchange(this.priceDetail.priceMarket())) {
                    this.priceDetail.instrumentId(null);
                } else {
                    this.priceDetail.instrumentDate(null);
                }
                data.wfPriceInfo.priceMakingType = models.Enums.PriceMakingType.FirePrice;
                data.wfPriceInfo.wfPriceDetails = [{
                    priceMakingType: models.Enums.PriceMakingType.FirePrice,
                    weight: data.wfContractDetailInfoes.sum(function (d) { return utils.parseFloat(d.weight); }),
                    tempPrice: this.priceDetail.tempPrice(),
                    wfFirePriceDetail: this.priceDetail.toFirePrice()
                }];
                if (data.isBuy) data.wfPriceInfo.wfPriceDetails[0].wfFirePriceDetail.isBuyerFire = !data.wfPriceInfo.wfPriceDetails[0].wfFirePriceDetail.isBuyerFire;
                data.wfPriceInfo.wfPriceDetails[0].wfPriceDetailId = data.wfPriceInfo.wfPriceDetails[0].wfFirePriceDetail.wfPriceDetailId = this.bucket._wfPriceDetailId;
                $.each(data.wfContractDetailInfoes, function (i, detail) {
                    detail.wfPriceInfo = null;
                });
            },
            /**
                *ajax请求的参数填充均价信息
                */
            _handleAvgPricing: function (data) {
                var dateStr = (this.priceDetail.startAndEndDate() || '').split(' ');
                if (!data.wfPriceInfo) data.wfPriceInfo = {
                    commodityId: this.selectedCommodity()
                };
                data.wfPriceInfo.priceMakingType = models.Enums.PriceMakingType.AvgPrice;
                data.wfPriceInfo.wfPriceDetails = [{
                    priceMakingType: models.Enums.PriceMakingType.AvgPrice,
                    weight: data.wfContractDetailInfoes.sum(function (d) { return utils.parseFloat(d.weight); }),
                    tempPrice: this.priceDetail.tempPrice(),
                    wfAvgPriceDetail: this.priceDetail.toAvgPrice()
                }];
                data.wfPriceInfo.wfPriceDetails[0].wfPriceDetailId = data.wfPriceInfo.wfPriceDetails[0].wfAvgPriceDetail.wfPriceDetailId = this.bucket._wfPriceDetailId;
                $.each(data.wfContractDetailInfoes, function (i, detail) {
                    detail.wfPriceInfo = null;
                });
            },
            /**
                *ajax请求的参数填充定价信息
                */
            _handleFixPrice: function (data) {
                var self = this;
                $.each(data.wfContractDetailInfoes, function (i, detail) {
                    // when declaring price type, the existing details' price info is null
                    if (!detail.wfPriceInfo) detail.wfPriceInfo = {};
                    detail.wfPriceInfo.priceMakingType = models.Enums.PriceMakingType.FixPrice;
                    detail.wfPriceInfo.unitId = data.unitId;
                    detail.wfPriceInfo.currencyId = data.currencyId;
                    detail.commodityId = self.selectedCommodity();
                    !detail.wfPriceInfo.wfPriceDetails && (detail.wfPriceInfo.wfPriceDetails = []);
                    var details = detail.wfPriceInfo.wfPriceDetails || [];
                    details[0] || (details[0] = {});
                    details[0].priceMakingType = models.Enums.PriceMakingType.FixPrice;
                    details[0].weight = detail.weight,
                    details[0].finalPrice = detail.actualPrice - detail.premiumDiscount;
                    detail.wfPriceInfo.wfPriceDetails = details;
                });
                data.wfPriceInfo = null;
            },
            /**
                * ajax请求的参数填充作价信息
                */
            _priceInfoToJson: function (data) {
                var priceMakingTypeEnum = models.Enums.PriceMakingType;
                if (this.priceMakingType() == priceMakingTypeEnum.FixPrice) {
                    this._handleFixPrice(data);
                } else if (this.priceMakingType() == priceMakingTypeEnum.FirePrice) {
                    this._handleFirePricing(data);
                } else if (this.priceMakingType() == priceMakingTypeEnum.AvgPrice) {
                    this._handleAvgPricing(data);
                } else {
                    if (!data.wfPriceInfo) data.wfPriceInfo = {
                    };
                    data.wfPriceInfo.priceMakingType = this.priceMakingType();
                    data.wfPriceInfo.commodityId = this.selectedCommodity();
                    if (this.priceMakingType() != priceMakingTypeEnum.ComplexPrice) {
                        data.wfPriceInfo.wfPriceDetails = [{
                            priceMakingType: this.priceMakingType(),
                            tempPrice: this.priceDetail.tempPrice(),
                            wfPriceDetailId: this.bucket._wfPriceDetailId,
                            weight: data.wfContractDetailInfoes.sum(function (d) { return utils.parseFloat(d.weight); })
                        }];
                    } else {
                        data.wfPriceInfo.wfPriceDetails = [];
                    }
                }
                if (data.wfPriceInfo) {
                    data.wfPriceInfoId = data.wfPriceInfo.wfPriceInfoId = this.bucket._wfPriceInfoId;
                    data.wfPriceInfo.currencyId = data.currencyId;
                    data.wfPriceInfo.unitId = data.unitId;
                }
            },
            /**
                * ajax请求的参数填充支付信息
                */
            _paymentOptionToJson: function (data) {
                var settleData = this.settleOptionViewModel.toJson();
                if (!settleData.currencyId)
                    settleData.currencyId = data.currencyId;
                data.wfSettleOption = settleData;
                if (this.settleOptionViewModel.needDiscount()) {
                    var discount = this.settleOptionViewModel.getDiscountData();
                    data.isAmountIncludeDiscountCost = discount.isAmountIncludeDiscountCost;
                    data.discountCost = discount.discountCost;
                }
            },
            /**
                *获取ajax请求的参数数据
                */
            toJson: function () {
                var priceMakingTypeEnum = models.Enums.PriceMakingType;
                var data = utils.serialize("#contractInfoForm .gmk-data-field", true);
                data.isBuy = data.isBuy === 'True';
                data.wfContractInfoId = options.isCopied ? 0 : options.loadKey;
                data.signDate = this.selectedSignDate();
                data.unitId = this.unitId();
                data.wfContractDetailInfoes = ko.mapping.toJS(this.contractDetails);
                data.priceMakingType = this.priceMakingType();
                $.each(data.wfContractDetailInfoes, function (i, d) {
                    d.price = utils.parseFloat(d.price);
                    d.actualPrice = (data.priceMakingType == priceMakingTypeEnum.FixPrice) ? utils.parseFloat(d.actualPrice) : null;
                });

                this._priceInfoToJson(data);
                this._paymentOptionToJson(data);

                return data;
            },
            /**
                *从ajax返回值填充点价信息
                */
            _fillFirePriceDetail: function (data) {
                var priceDetail = data.wfPriceInfo.wfPriceDetails[0];
                if (priceDetail.wfFirePriceDetail.fireStartDate && priceDetail.wfFirePriceDetail.fireEndDate) {
                    priceDetail.wfFirePriceDetail.startAndEndDate = utils.formatDate(priceDetail.wfFirePriceDetail.fireStartDate) + ' - ' + utils.formatDate(priceDetail.wfFirePriceDetail.fireEndDate);
                }
                this.priceDetail.restore(priceDetail.wfFirePriceDetail);

                if (data.isBuy) this.priceDetail.isBuyerFire(this.priceDetail.isBuyerFire() === 'true' ? 'false' : 'true');
                this.priceDetail.tempPrice(priceDetail.tempPrice);

                if (models.isForeignExchange(this.priceDetail.priceMarket())) {
                    // instrument id is binding to dropdown, when pricemarket is change, dropdown's source will change too
                    // but for LME, the instrument id is actually mapped to instrument date rather than an option in dropdown.
                    this.priceDetail.instrumentId(priceDetail.wfFirePriceDetail.instrumentId);
                    this.priceDetail.instrumentDate(utils.formatDate((models.findById(models.AllInstruments(), this.priceDetail.instrumentId()) || {}).currentEndDate));
                }
                this._resetFirePriceSummary();
                this._setCurrency(this.priceDetail.priceMarket());
            },
            /**
                *从ajax返回值填充均价信息
                */
            _fillAvgPriceDetail: function (data) {
                var priceDetail = data.wfPriceInfo.wfPriceDetails[0];
                priceDetail.wfAvgPriceDetail.startAndEndDate = utils.formatDate(priceDetail.wfAvgPriceDetail.startTime) + ' - ' + utils.formatDate(priceDetail.wfAvgPriceDetail.endTime);
                this.priceDetail.restore(priceDetail.wfAvgPriceDetail);
                this.priceDetail.tempPrice(priceDetail.tempPrice);
                if (!models.isForeignExchange(this.priceDetail.priceMarket())) this._setInstrumentText(priceDetail.wfPriceInstruments);
                this._resetAvgPriceSummary();
                this._setCurrency(this.priceDetail.priceMarket());
            },
            /**
                * 作价方式为均价时，设置其起止日期内的合约信息
                */
            _setInstrumentText: function (priceInstruments) {
                var _this = this;
                if (!priceInstruments || !priceInstruments.length) {
                    this.priceDetail.instrumentText(null);
                    return;
                }
                this.priceDetail.instrumentText($.map(priceInstruments, function (p) {
                    return '合约{0}：{1}至{2}'.format(_this.findInstrument(p.wfInstrumentId), utils.formatDate(p.startDate), utils.formatDate(p.endDate));
                }).join('；'));
            },
            /**
            *从ajax返回数据填充支付方式信息
            */
            _fillPaymentData: function (data, discount) {
                if (data && data.wfSettleOptionDetails.length > 0) {
                    data.wfSettleOptionDetails[0].exchangeProcessType = data.exchangeProcessType;
                    data.wfSettleOptionDetails[0].paymentFormType = data.paymentFormType;
                    this.settleOptionViewModel.fill(data.wfSettleOptionDetails[0], data, data.optionType);
                    this.settleOptionViewModel.setDiscountData(discount);
                }
            },
            /**
            *从ajax返回数据填充质押基本信息
            */
            _fillPlegeContract: function (data) {
                var self = this;
                //ko.mapping.fromJS(data.wfPledgeContract,this.pledgeContract);
                this.pledgeContract.pledgeType((data.wfPledgeContract || {}).pledgeType);
                this.pledgeContract.pledgeRate((data.wfPledgeContract || {}).pledgeRate);
                this.pledgeContract.pledgeExchangeId((data.wfPledgeContract || {}).pledgeExchangeId);
                this.pledgeContract.pledgeInterestRate((data.wfPledgeContract || {}).pledgeInterestRate);
                this.pledgeContract.wfContractInfoId(data.wfContractInfoId);

                //单独设置客户信息
                $("#PledgeCustomerId").select2('val',data.customerId);
            },
            /**
            * 子类覆盖已填充自定义信息
            */
            _onPostFill: function (data) {
                // nothing to do
            },
            /**
                * 从ajax返回数据填充作价信息禁止交易
                */
            _fillPriceInfo: function (data) {
                var priceMakingTypeEnum = models.Enums.PriceMakingType;
                if (data.wfPriceInfo) {
                    this.bucket._wfPriceInfoId = data.wfPriceInfo.wfPriceInfoId;
                    if (data.wfPriceInfo.priceMakingType != priceMakingTypeEnum.ComplexPrice) //复杂作价方式不需要detail
                        this.bucket._wfPriceDetailId = data.wfPriceInfo.wfPriceDetails[0].wfPriceDetailId;
                }
                if (data.priceMakingType == priceMakingTypeEnum.FirePrice) {
                    this._fillFirePriceDetail(data);
                } else if (data.priceMakingType == priceMakingTypeEnum.AvgPrice) {
                    this._fillAvgPriceDetail(data);
                } else if (data.wfPriceInfo) {
                    if (data.wfPriceInfo.priceMakingType != priceMakingTypeEnum.ComplexPrice)
                        this.priceDetail.tempPrice(data.wfPriceInfo.wfPriceDetails[0].tempPrice);
                }
            },
            /**
                *从ajax返回值填充合同信息
                */
            fill: function (data) {
                this.approvalStatus(data.approvalStatus);
                utils.deserialize("#contractInfoForm .gmk-data-field", data);
                if (data.isBuy) this.isBuy('True');
                var $customerId = $("#CustomerId");
                $customerId.select2("val", $customerId.val());
                setLabel();
                this.selectedSignDate(data.signDate);
                this.selectedCommodity(data.commodityId);
                this.selectedSalerId(data.salerId);
                this.selectedDepartmentId(data.departmentId);
                this.selectedAccountEntityId(data.accountingEntityId);
                this.priceMakingType(data.priceMakingType);
                for (var i = 0; i < data.wfContractDetailInfoes.length; i++) {
                    this.contractDetails.push(ko.mapping.fromJS(data.wfContractDetailInfoes[i]));
                }
                this.unitId(data.unitId);
                this._onPostFill(data);
                this._fillPriceInfo(data);
                this._fillPaymentData(data.wfSettleOption, {
                    isAmountIncludeDiscountCost: data.isAmountIncludeDiscountCost,
                    discountCost: data.discountCost,
                });

                if (data.contractType == this.Enums.ContractType.PledgeContract) {
                    this._fillPlegeContract(data);
                }
            },
            /**
                * 保存之前验证数据是否合法
                */
            isValid: function (param) {
                return true;
            },
            /**
                *保存合同
                *@param {bool} ignoreRisk - 是否忽略风险警告
                *@param {bool} ignorePeriodRisk - 是否忽略账期风险
                *@param {function} callback - 请求成功之后的回调函数
                */
            save: function (ignoreRisk, ignorePeriodRisk, callback) {
                var self = this;
                var param = this.toJson();
                var confirmMsg = null;
                if (!this.isValid(param)) return false;
                var deliveryDates = $.map(param.wfContractDetailInfoes, function (r) {
                    if (r.deliveryDate) {
                        return new Date(r.deliveryDate);
                    }
                });
                if (deliveryDates.length > 0) {
                    var deliveryDate = deliveryDates.max();
                    var payDate = param.payDate ? (new Date(param.payDate)) : null;
                    if (parseInt(param.spotAmountType) == models.Enums.ExchangeProcessType.AmountFirst && !utils.compareDate(deliveryDate, payDate)) {
                        alert("先款后货的合同，交货日期必须大于收款日期！");
                        return false;
                    } else if (parseInt(param.spotAmountType) == models.Enums.ExchangeProcessType.SpotFirst && !utils.compareDate(payDate, deliveryDate)) {
                        alert("先货后款的合同，交货日期必须小于收款日期！");
                        return false;
                    }
                    if (!(deliveryDate == null || payDate == null || utils.getDateDiff(payDate, deliveryDate) == parseInt(param.accountPeriod))) {
                        confirmMsg = "合同账期与合同中对应的付款日期，发货日期不符，确认提交？";
                    }
                }
                if (!this.ignoerPeriodNotEqualRisk() && confirmMsg != null) {
                    confirm(confirmMsg, function () {
                        self.ignoerPeriodNotEqualRisk(true);
                        saveWithRisk.call(self, ignoreRisk, ignorePeriodRisk, param, callback);
                    });
                } else {
                    saveWithRisk.call(self, ignoreRisk, ignorePeriodRisk, param, callback);
                }
            },
            /**
                *“保存”按钮的回调函数
                */
            onSave: function () {
                this.save(false, false, base._back);
            },
            /**
                *“保存并打印”按钮的回调函数
                */
            onSaveAndPrint: function () {
                var self = this;
                var win = utils.openWindow();
                base._post(options.saveUrl, this.toJson(), function (result) {
                    ////location.href = 
                    var printUrl = options.archiveIndexUrl + '?' + $.param({
                        dataSourceId: result.data.wfContractInfoId,
                        templateType: models.Enums.BillTemplateType.Contract,
                        commodityId: self.selectedCommodity()
                    });
                    win.redirectTo(printUrl);
                    History.back();
                });
            },
            /**
                *“保存并提交审批”按钮的回调函数
                */
            onSaveAndReqestApprove: function (redirect) {
                this.save(false, false, function (result) {
                    if (result.data.approvable) {
                        location.href = options.requestCreateUrl + '?' + $.param({
                            objectId: result.data.wfContractInfoId,
                            flowType: models.Enums.ApprovalType.Contract,
                            commodityId: result.data.commodityId,
                            redirect: redirect
                        });
                    } else {
                        utils.alert('保存成功，此单据不支持审批。', base._back);
                    }
                });
            },
            /**
                * 设置界面上的初始值
                */
            _loadDefaults: function () {
                this.selectedSignDate(moment().startOf('day').toJSON());
                this.selectedCommodity(models.UserCommodities[0].id);
                this.bucket._isInitialized = true;
            },
            /**
                * 加载合同信息并初始化界面
                */
            _loadData: function () {
                var self = this;
                this.isEdit(!options.isCopied);
                base._get(options.loadUrl, {
                    id: options.loadKey, isCopied: options.isCopied
                }, function (result) {
                    var record = result.data;
                    self.fill(record);

                    //$('.remove-detail').attr('disabled', 'disabled');
                    //if (!options.isDeclaring) {
                    //base._get(options.getEditablePropertiesUrl, { contractId: options.loadKey, isCopied: options.isCopied }, function (result) {
                    //    var data = result.data || '', parts = data.split(';'), states;
                    //    var editables = parts[0], deletables = parts[1], $elem;
                    //    $.each(editables.split(','), function (i, item) {
                    //        if (item) {
                    //            $elem = $('#{0},[name="{0}"],[name$=".{0}"]'.format(item));
                    //            if (item == 'FireStartDate') {
                    //                item = 'StartAndEndDate';
                    //            } else if (item == 'DeliveryAddress') {
                    //                $elem.css('background-color', '');
                    //            } else if (item == 'WFContractDetailInfoes') {
                    //                self.isEditContractDetailEnabled(true);
                    //            }
                    //            $elem.removeAttr('disabled');
                    //        }
                    //    });
                    //    $.each(deletables.split(','), function (i, item) {
                    //        if (item == 'WFContractDetailInfoes') self.isAddOrRemoveContractDetailEnabled(true);
                    //    });
                    //    self.bucket._isInitialized = true;
                    //});
                    //}

                    if (options.isDeclaring) {
                        self._setPropertiesEditable(['WFPriceInfo'], ['FirePrice', 'AvgPrice']);
                    }
                    self.bucket._isInitialized = true;
                }, true);
            },
            /**
               * 设置可编辑的属性 
               * editable-单个属性
               * priceEditable- editable中包含'WFPriceInfo'时，特殊指定具体哪个作价方式模态框可以编辑
               */
            _setPropertiesEditable: function (editable, priceEditable) {
                //全部不可编辑
                $('input:not(.select2-input),select').attr('disabled', 'disabled');
                $('.remove-detail').attr('disabled', 'disabled'); //删除按钮
                $('.add-detail').attr('disabled', 'disabled'); //添加
                $('.edit-detail').attr('disabled', 'disabled'); //编辑
                $("#PriceInfoDiv").find('button').attr('disabled', 'disabled'); //作价方式
                if (editable && editable.length > 0) {
                    $.each(editable, function (i, item) {
                        if (item) {
                            var $elem = $('#{0},[name="{0}"],[name$=".{0}"]'.format(item));
                            $elem.removeAttr('disabled');
                        }
                        if (item == 'WFContractDetailInfoes') { //详情
                            self.isAddOrRemoveContractDetailEnabled(true);
                            self.isEditContractDetailEnabled(true);
                            $('.remove-detail').removeAttr('disabled'); //删除按钮
                            $('.add-detail').removeAttr('disabled'); //添加
                            $('.edit-detail').removeAttr('disabled'); //编辑
                        }
                        if (item == 'WFPriceInfo') { //作价方式
                            $("#PriceInfoDiv").find('button').removeAttr('disabled');
                            if (priceEditable && priceEditable.length > 0) {
                                $.each(priceEditable, function (j, price) {
                                    switch (price) {
                                        case 'FirePrice':
                                            $("#firePriceModal").find('input:not(.select2-input),select').removeAttr('disabled');
                                            break;
                                        case 'AvgPrice':
                                            $("#AvgPriceModal").find('input:not(.select2-input),select').removeAttr('disabled');
                                            break;
                                        case 'DeclaringPrice':
                                            $("#SetPriceModal").find('input:not(.select2-input),select').removeAttr('disabled');
                                            break;
                                    }
                                });
                            }
                        }
                    });
                }
            },
            /**
                * 初始化函数，在_init之后调用的第一个函数
                */
            initialize: function () {
                var self = this;
                if (parseInt(options.loadKey) > 0) {
                    this._loadData();
                } else {
                    this._loadDefaults();
                }
                $('#CommodityId').change(function () {
                    if (self.bucket._isInitialized) $('#ContractCode').val('');
                });
            },
        };
        $.extend(this, _methods);
        /*******************public methods end*****************/
        this._inited(true);
    },
    /**
        *注册observable的监听函数
        */
    _registerSubscribers: function (models) {
        var vm = this;
        this.priceDetail.priceMarket.subscribe(function (newVal) {
            if (vm.bucket._muteChange) return;
            $.each(vm._AllExchanges, function (i, item) {
                if (item.id == newVal) {
                    if (item.type & models.Enums.CorporationTypeFlag.SpotPriceMakingMarket) vm.priceDetail.instrumentId(null);
                    return false;
                }
            });
            vm.priceDetail.dayCount(null);
            vm._setInstrumentText(null);
        });
        this.priceDetail.startAndEndDate.subscribe(function () {
            if (vm.bucket._muteChange) return;
            vm.priceDetail.dayCount(null);
            vm._setInstrumentText(null);
        });
        vm.isBuy.subscribe(function (newValue) {
            if (vm.bucket._isInitialized) $('#ContractCode').val('');
        });
        vm.priceMakingType.subscribe(function (newValue) {
            var priceMakingTypeEnum = models.Enums.PriceMakingType;
            if (newValue == priceMakingTypeEnum.FixPrice) {
                $('#Price').attr('placeholder', newValue ? '价格（包括升贴水）' : '临时单价');
                vm.priceDetail.reset();
            } else if (newValue == priceMakingTypeEnum.FirePrice) {
                vm.priceDetail.resetAvgPrice();
            } else if (newValue == priceMakingTypeEnum.AvgPrice) {
                vm.priceDetail.resetFirePrice();
            }
        });
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    vm.brands(commodity.brands.slice(0));
                    vm.specifications(commodity.specifications.slice(0));
                }
                var unitId = models.findUnitId(id);
                vm.unitId(unitId);
            }
        });
    }
};

/**
    * 现货合同
    */
ns.CommodityContractViewModel = function () {
    // _super返回直接超类的引用
    var self = this, _super = ns.CommodityContractViewModel.prototype;

    this._init = function (models, options) {
        var base = GMK.Features.FeatureBase;
        _super._init.apply(_super, arguments);

        var _untradableDaysCache = {};
        var _$instrumentDate = $('#InstrumentDate');
        var _lastKey;
        function _getUntradableDays(exchangeId, startDate, callback) {
            // long contract series has date range rather than sign date ,
            // so startDate may be null
            if (!startDate) startDate = moment().startOf('d').add('d', -90).toDate();
            var key = exchangeId + '_' + (startDate || '').valueOf();
            if (_lastKey == key) {
                _$instrumentDate.datepicker('show');
                return;
            }
            _lastKey = key;
            if (_untradableDaysCache[key]) {
                callback(_untradableDaysCache[key]);
            }
            base._get(options.getUntradableDaysUrl, { exchangeId: exchangeId, startDate: startDate || moment().startOf('d').toDate() }, function (result) {
                result.data = $.map(result.data, function (d) {
                    return moment(d).toDate();
                });
                _untradableDaysCache[key] = result.data;
                callback(result.data);
            });
        }
        var _showInstrumentDatepicker = (function () {
            _getUntradableDays(this.priceDetail.priceMarket(), this.selectedSignDate(), function (data) {
                _$instrumentDate.off('focusin').datepicker('option', 'disabledDates', data).datepicker('show');
            });
        }).bind(self);
        _$instrumentDate.focusin(_showInstrumentDatepicker);

        var _methods = {
            toJson: function () {
                var contractTypeEnum = models.Enums.ContractType;
                var data = _super.toJson();

                data.contractType = contractTypeEnum.NormalContract;
                if (options.tradeType == models.Enums.SimpleTradeType.Domestic) data.tradeType = models.Enums.TradeType.Domestic;
                return data;
            },
            onSaveAndReqestApprove: function () {
                _super.onSaveAndReqestApprove.bind(this)(this.getRedirectUrlAfterApproval());
            },
            getRedirectUrlAfterApproval: function () {
                return options.indexUrl;
            },
            onPreFirePriceSet: function () {
                _super.onPreFirePriceSet();
                _$instrumentDate.datepicker('option', 'minDate', utils.parseDate(this.selectedSignDate()));
            },
            onCloseInsrumentDate: function () {
                _$instrumentDate.off('.focusin').focusin(_showInstrumentDatepicker);
            },
            initialize: function () {
                if (parseInt(options.loadKey) > 0) {
                    //$('#contractInfoForm input:not(.select2-input),#contractInfoForm select').attr('disabled', 'disabled');
                    //$('#ContractCode + .btn').attr('disabled', 'disabled');
                }
                _super.initialize.bind(this)();
            }
        };
        $.extend(this, _methods);
    };
};
ns.CommodityContractViewModel.prototype = new ns.BaseContractViewModel();
ns.CommodityContractViewModel.prototype.constructor = ns.CommodityContractViewModel;

/**
    * 长单批次合同
    */
ns.LongContractSeriesViewModel = function () {
    // _super返回直接超类的引用
    var self = this, _super = ns.LongContractSeriesViewModel.prototype;

    this.longContractSeries = {
        dateRange: ko.observable(),
        wfLongContractDetailId: null
    };

    this._init = function (models, options) {
        var base = GMK.Features.FeatureBase;
        _super._init.apply(_super, arguments);

        this.isFirePriceDisable = ko.computed(function () {
            var v1 = this.priceMakingType() != models.Enums.PriceMakingType.FixPrice,
                    v2 = _super.isFirePriceDisable();
            return (v1 && v2);
        }, this);
        this.isAvgPriceDisable = ko.computed(function () {
            var v1 = this.priceMakingType() != models.Enums.PriceMakingType.FixPrice,
                                v2 = _super.isAvgPriceDisable();
            return (v1 && v2);
        }, this);
        this.isComplexPriceDisable = ko.computed(function () {
            var v1 = this.priceMakingType() != models.Enums.PriceMakingType.FixPrice,
                                v2 = _super.isComplexPriceDisable();
            return (v1 && v2);
        }, this);
        this.isUndelarePriceDisable = ko.computed(function () {
            var v1 = this.priceMakingType() != models.Enums.PriceMakingType.FixPrice,
                                            v2 = _super.isUndelarePriceDisable();
            return (v1 && v2);
        }, this);
        this._registerSubscribers(models);
        var _methods = {
            _onPostFill: function (data) {
                this.longContractSeries.dateRange('{0} - {1}'.format(utils.formatDate(data.wfLongContractDetail.startTime), utils.formatDate(data.wfLongContractDetail.endTime)));
                this.longContractSeries.wfLongContractDetailId = data.wfLongContractDetail.wfLongContractDetailId;
                this.selectedSignDate(data.wfLongContractDetail.startTime);
            },
            initialize: function () {
                var self = this;
                //$('input[name="IsBuy"],#CommodityId,#DepartmentId,#AccountingEntityId,#SalerId').attr('disabled', 'disabled');
                //$('#ContractCode + .btn').attr('disabled', 'disabled');
                $.each(['IsBuy', 'CommodityId', 'DepartmentId', 'AccountingEntityId', 'SalerId'], function (i, v) {
                    $('#' + v).attr('disabled', 'disabled');
                });
                if (options.loadKey) {
                    // fill data from itself
                    _super.initialize.bind(this)();
                } else {
                    // fill data from the long contract which it belongs to
                    base._get(options.loadUrl, { id: options.longContractInfoId }, function (result) {
                        utils.deserialize('#contractInfoForm .gmk-data-field.init-with-data', result.data);
                        self.bucket._isInitialized = true;
                    });
                }
            },
            toJson: function () {
                var contractTypeEnum = models.Enums.ContractType;
                var data = _super.toJson();
                data.contractType = contractTypeEnum.LongContractDetail;
                var splitting = this.longContractSeries.dateRange().split(' ');
                data.wfLongContractDetail = {
                    startTime: splitting[0],
                    endTime: splitting[2],
                    wfLongContractDetailId: this.longContractSeries.wfLongContractDetailId
                };
                data.parentId = options.longContractInfoId;
                return data;
            },
            isValid: function (param) {
                if ((param.priceMakingType == models.Enums.PriceMakingType.FixPrice) || !param.priceMakingType) {
                    alert('请选择作价方式');
                    return false;
                }
                return true;
            }
        }
        $.extend(this, _methods);
    };
    this._registerSubscribers = function (models) {
        var _this = this;
        this.longContractSeries.dateRange.subscribe(function (newVal) {
            _this.selectedSignDate((newVal || '').split(' ')[0]);
        });
    };
};
ns.LongContractSeriesViewModel.prototype = new ns.CommodityContractViewModel();
ns.LongContractSeriesViewModel.prototype.constructor = ns.LongContractSeriesViewModel;

/**
    * 质解押合同
    */
ns.PledgeContractViewModel = function () {
    // _super返回直接超类的引用
    var self = this, _super = ns.PledgeContractViewModel.prototype;

    this._init = function (models, options) {
        var base = GMK.Features.FeatureBase;
        _super._init.apply(_super, arguments);
        this.isBuy(options.isRedeem === true ? 'True' : 'False');
        this.pledgeContract = {
            pledgeType: ko.observable(),
            pledgeRate: ko.observable(),
            pledgeInterestRate: ko.observable(),
            pledgeExchangeId: ko.observable(),
            wfContractInfoId: ko.observable(),
        };
        this.pledgeCustomers = ko.computed(function () {
            if (self.pledgeContract.pledgeType() == models.Enums.PledgeType.Exchange) { //所内质押
                return models.AllBrokers;
            } else if (self.pledgeContract.pledgeType() == models.Enums.PledgeType.Other) { //所外质押
                return models.AllBanks;
            } else
                return models.AllBrokers.concat(models.AllBanks);
        });

        this.showPledgeDiv = ko.computed(function () {
            return !options.isRedeem && self.isBuy() == 'False';
        });

        this.customerId.subscribe(function (newVal) {
            if (!newVal) {
                self.viewModel.pledgeRate('');
                self.viewModel.pledgeInterestRate('');
                return;
            }
            var customer = $.grep(self.pledgeCustomers(), function (item) {
                return item.id == newVal;
            })[0];
            if (!self.isEdit()) {
                self.pledgeContract.pledgeRate(customer.pledgeRate);
                self.pledgeContract.pledgeInterestRate(customer.pledgeInterestRate);
            }
        });

        var _methods = {
            toJson: function () {
                var contractTypeEnum = models.Enums.ContractType;
                var data = _super.toJson();
                data.contractType = contractTypeEnum.PledgeContract;
                if (options.isRedeem) data.parentId = options.pledgeContractId;

                if (options.tradeType == models.Enums.SimpleTradeType.Foreign) data.tradeType = models.Enums.TradeType.Entrepot;
               // if (!options.isRedeem)
                    data.wfPledgeContract = ko.mapping.toJS(self.pledgeContract);
                data.customerId = $("#PledgeCustomerId").val();
                return data;
            },
            getRedirectUrlAfterApproval: function () {
                return options.pledgeContractIndexUrl;
            },
            initialize: function () {
                var _this = this;
                if (options.isRedeem) {
                    base._get(options.loadUrl, { id: options.pledgeContractId }, function (result) {
                        // fill data from its pledge contract;auto mapping 失效？
                        var data = result.data;                       
                        self.pledgeContract.pledgeType(data.wfPledgeContract.pledgeType);
                        self.pledgeContract.pledgeExchangeId(data.wfPledgeContract.pledgeExchangeId);
                        self.pledgeContract.pledgeInterestRate(data.wfPledgeContract.pledgeInterestRate);
                        self.pledgeContract.pledgeRate(data.wfPledgeContract.pledgeRate);

                        _this.selectedCommodity((data.commodityId));
                        $('#CorporationId').val(data.corporationId);
                        _this.customerId(data.customerId);
                        $("#PledgeCustomerId").select2('val', data.customerId);
                        $('#PledgeCustomerId').prev().tooltip({
                            title: models.findCustomer(data.customerId)
                        });
                        _this.selectedDepartmentId(data.departmentId);
                        _this.selectedSalerId(data.salerId);
                        _this.selectedAccountEntityId(data.accountingEntityId);
                        self.bucket._isInitialized = true;
                    });
                } else {
                    _super.initialize.bind(this)();
                }
            }
        };
        $.extend(this, _methods);
    };
};
ns.PledgeContractViewModel.prototype = new ns.CommodityContractViewModel();
ns.PledgeContractViewModel.prototype.constructor = ns.PledgeContractViewModel;

/**
    *交割合同
    */
ns.DeliveryContractViewModel = function () {
    var _super = ns.DeliveryContractViewModel.prototype;
    //this.exchangeIdForDeliver = ko.observable();
    this._init = function (models, options) {
        _super._init.apply(_super, arguments);
        this.deliveryContract = ko.mapping.fromJS(options.newDeliveryContract || {});
        this._registerSubscribers(models);

        var _methods = {
            fill: function (data) {
                ko.mapping.fromJS(data.wfDeliveryContract || {}, this.deliveryContract);
                _super.fill(data);
                //this.exchangeIdForDeliver((data.wfDeliveryContract || {}).exchangeId);
            },
            onSaveAndReqestApprove: function () {
                _super.onSaveAndReqestApprove(options.deliverContractUrl);
            },
            toJson: function () {
                var contractTypeEnum = models.Enums.ContractType;
                var data = _super.toJson();
                data.contractType = contractTypeEnum.Delivery;
                data.wfDeliveryContract = ko.mapping.toJS(this.deliveryContract);
                if (options.tradeType == models.Enums.SimpleTradeType.Foreign) data.tradeType = models.Enums.TradeType.Export;
                else data.tradeType = models.Enums.TradeType.Domestic;
                return data;
            },
            initialize: function () {
                if (parseInt(options.loadKey) > 0) {
                    //$('#contractInfoForm input:not(.select2-input),#contractInfoForm select').attr('disabled', 'disabled');
                    //$('#ContractCode + .btn').attr('disabled', 'disabled');
                }
                _super.initialize.bind(this)();
            }
        };
        $.extend(this, _methods);
    };

    this._registerSubscribers = function (models) {
        var _this = this;
        this.deliveryContract.exchangeId.subscribe(function (newVal) {
            _this._setCurrency(newVal);
        });
    };
};
ns.DeliveryContractViewModel.prototype = new ns.BaseContractViewModel();
ns.DeliveryContractViewModel.prototype.constructor = ns.DeliveryContractViewModel;

/**
    *关联合同
    */
ns.ConnectedContractViewModel = function () {
    var _super = ns.ConnectedContractViewModel.prototype;

    this.isConnectedOrLegacyConnected = ko.observable(false);

    this._init = function (models, options) {
        var base = GMK.Features.FeatureBase, self = this;
        _super._init.apply(this, arguments);

        var epTypes = this.Enums.ExchangeProcessType;
        var paymentFormTypes = this.Enums.PaymentFormType;
        this.exchangeProcessTypes = $.grep(this.EnumOptions.ExchangeProcessType, function (r) {
            return r.value == epTypes.AmountFirst || r.value == epTypes.SpotFirst;
        });
        this.paymentFormTypes = $.grep(this.EnumOptions.PaymentFormType, function (r) {
            return r.value == paymentFormTypes.TelegraphicTransfer || r.value == paymentFormTypes.Cheque;
        });

        this.currCorporationList = $.grep(this._AllCorporations, function (r) {
            return r.id == options.corporationId;
        });
        this.corporationListWithoutCurr = $.grep(this._AllCorporations, function (r) {
            if (self.currCorporationList.length > 0) {
                return r.rank >= self.currCorporationList[0].rank && r.id !== options.corporationId;
            } else
                return true;
        });
        this.connectedContract = {
            isSellEditable: ko.observable(false),
            connectedContractIsbuy: ko.observable("false"),
            data: ko.mapping.fromJS(options.connectedContract || {}),
            corporationEditable: ko.observable(true),
            onGenerateContractCode: function (isBuy, item, event) {
                var self = this;
                base._get(options.generateContractCodeUrl, { isBuy: isBuy, commodityId: this.selectedCommodity() }, function (data) {
                    if (!isBuy)
                        self.connectedContract.data.SellContractCode(data.result);
                    else
                        self.connectedContract.data.BuyContractCode(data.result);
                });
            }
        };
        this.connectedContract.TransactionTypes = $.grep(models.EnumOptions.TransactionType, function (r) {
            return r.value != models.Enums.TransactionType.Normal;
        });
        this.sellCorpSelectable = ko.observable();
        this.buyCorpSelectable = ko.observable();

        function _setCurrCorp() {
            var transactionType = self.connectedContract.data.transactionType();
            //self.settleOptionViewModel.settleOptionType(transactionType === models.Enums.TransactionType.InternalTransaction ? models.Enums.OptionType.Undeclared : models.Enums.OptionType.Simple);
            self.sellCorpSelectable(!(transactionType === models.Enums.TransactionType.InternalTransaction ||
                self.connectedContract.connectedContractIsbuy() === 'false'));
            self.buyCorpSelectable(!(transactionType === models.Enums.TransactionType.InternalTransaction ||
                self.connectedContract.connectedContractIsbuy() !== 'false'));
            if (!self.isEdit() && !self.sellCorpSelectable()) {
                if (self.buyCorpSelectable()) {
                    self.connectedContract.data.buyCorporationId(self.connectedContract.data.sellCorporationId());
                }
                self.connectedContract.data.sellCorporationId(options.corporationId);
            }
            if (!self.isEdit() && !self.buyCorpSelectable()) {
                if (self.sellCorpSelectable()) {
                    self.connectedContract.data.sellCorporationId(self.connectedContract.data.buyCorporationId());
                }
                self.connectedContract.data.buyCorporationId(options.corporationId);
            }
        }
        _setCurrCorp();
        this.connectedContract.data.transactionType.subscribe(_setCurrCorp);
        this.connectedContract.connectedContractIsbuy.subscribe(_setCurrCorp);

        this.connectedContract.sellDepartments = ko.computed(function () {
            var _this = this, commodityId = _this.selectedCommodity(), isBuy = _this.connectedContract.connectedContractIsbuy(),
                sellCorporationId = _this.connectedContract.data.sellCorporationId();
            if (this.connectedContract.data.transactionType() === models.Enums.TransactionType.InternalTransaction) {
                var departments = $.map($.grep(models.AllCommodities, function (r) { //如果为自交易，卖方只能为当前用户在的部门
                    return commodityId === r.id;
                }), function (r) {
                    return r.businessDepartments || [];
                });
                return departments || [];
            } else {
                var avilableBusinessDepartments = [];
                $.each(_this.AllBusinessDepartments, function (i, de) {
                    $.each($.map(models.ListCommodities({
                        forUser: isBuy === 'false',
                        tradeType: null,
                        corporationId: sellCorporationId,
                        departmentId: de.id
                    }), function (r) {
                        return r.id;
                    }), function (j, comm) {
                        if (comm === commodityId) { //列表只显示被选中的品种下的部门
                            avilableBusinessDepartments.push(de);
                            return false;
                        }
                    });
                });
                return avilableBusinessDepartments || [];
            }
        }, this);
        this.connectedContract.buyDepartments = ko.computed(function () {
            var avilableBusinessDepartments = [], _this = this, isBuy = _this.connectedContract.connectedContractIsbuy(),
                    buyCorporationId = _this.connectedContract.data.buyCorporationId(),
                    commodityId = _this.selectedCommodity();
            $.each(this.AllBusinessDepartments, function (i, de) {
                var commIds = $.map(models.ListCommodities({
                    forUser: isBuy !== 'false',
                    tradeType: null,
                    corporationId: buyCorporationId,
                    departmentId: de.id
                }), function (r) {
                    return r.id;
                });
                $.each(commIds, function (j, comm) {
                    if (comm === commodityId) { //列表只显示被选中的品种下的部门
                        avilableBusinessDepartments.push(de);
                        return false;
                    }
                });
            });
            return avilableBusinessDepartments || [];
        }, this);
        this.connectedContract.sellAccountings = ko.computed(function () {
            var _this = this, sellDepartmentId = _this.connectedContract.data.sellDepartmentId();
            return $.map($.grep(this.connectedContract.sellDepartments(), function (r) {
                return sellDepartmentId === r.id;
            }), function (r) {
                var accountEntities = [];
                $.each(r.accountEntityIds, function (i, acc) {
                    $.each(_this.AllAccountEntities, function (j, accentity) {
                        if (acc === accentity.id) {
                            accountEntities.push(accentity);
                            return false;
                        }
                    });
                });
                return accountEntities;
            });
        }, this);
        this.connectedContract.buyAccountings = ko.computed(function () {
            var _this = this, buyDepartmentId = _this.connectedContract.data.buyDepartmentId();
            return $.map($.grep(this.connectedContract.buyDepartments(), function (r) {
                return buyDepartmentId === r.id;
            }), function (r) {
                var accountEntities = [];
                $.each(r.accountEntityIds, function (i, acc) {
                    $.each(_this.AllAccountEntities, function (j, accentity) {
                        if (acc === accentity.id) {
                            accountEntities.push(accentity);
                            return false;
                        }
                    });
                });
                return accountEntities;
            });
        }, this);
        this.connectedContract.sellSalers = ko.computed(function () {
            var _this = this, sellDepartmentId = _this.connectedContract.data.sellDepartmentId();
            return $.map($.grep(this.connectedContract.sellDepartments(), function (r) {
                return sellDepartmentId === r.id;
            }), function (r) {
                return r.allSalers || [];
            });
        }, this);
        this.connectedContract.buySalers = ko.computed(function () {
            var _this = this, buyDepartmentId = _this.connectedContract.data.buyDepartmentId();
            return $.map($.grep(this.connectedContract.buyDepartments(), function (r) {
                return buyDepartmentId === r.id;
            }), function (r) {
                return r.allSalers || [];
            });
        }, this);
        this.connectedContract.isApproval = ko.computed(function () {
            var condition1 = (this.connectedContract.data.transactionType() == models.Enums.TransactionType.ConnectedTransaction);
            // var condition2 = (models.findById(models.AllCorporations, this.connectedContract.data.SellCorporationId()).rank <= models.findById(models.AllCorporations, this.connectedContract.data.BuyCorporationId()).rank);
            return condition1;
        }, this);

        var _methods = {
            initialize: function () {
                var self = this;
                this.isConnectedOrLegacyConnected(this.isConnectedOrLegacyConnected() || !!this.isConnectedTranslation);

                if (parseInt(options.loadKey) > 0) {
                    this.isEdit(!options.isCopied);
                    if (!options.isConnectedTranslation) {
                        //$('input:not(.select2-input),select').attr('disabled', 'disabled');
                    }
                    base._get(options.loadUrl, {
                        id: options.loadKey, isCopied: options.isCopied, isConnectedTranslation: options.isConnectedTranslation
                    }, function (result) {
                        var record = result.data;
                        self.isConnectedOrLegacyConnected(self.isConnectedOrLegacyConnected() || !!self.findCorporation(record.customerId));
                        self.fillConnectedContract(record);
                        self._fillPaymentData(record.wfSettleOption, { //默认关联交易没有折扣信息
                            isAmountIncludeDiscountCost: null,
                            discountCost: null,
                        });
                        //明细可编辑
                        self.isAddOrRemoveContractDetailEnabled(true);
                        self.isEditContractDetailEnabled(true);
                    }, true);
                } else {
                    this.selectedSignDate(moment().startOf('day').toJSON());
                    this.selectedCommodity(models.UserCommodities[0].id);

                    if (window.tradeType & models.Enums.SimpleTradeType.Foreign) {
                        self.connectedContract.data.transactionType(models.Enums.TransactionType.ConnectedTransaction);
                    }
                    self.bucket._isInitialized = true;
                }
                $('#CommodityId').change(function () {
                    if (self.bucket._isInitialized) $('#ContractCode').val('');
                });

            },
            fillConnectedContract: function (data) {
                this.connectedContract.data = ko.mapping.fromJS(data, {}, this.connectedContract.data);
                this.connectedContract.data.transactionType(data.transactionType);
                this.priceMakingType(data.priceMakingType);
                this.selectedSignDate(data.signDate);
                this.selectedCommodity(data.commodityId);

                for (var i = 0; i < data.wfContractDetailInfoes.length; i++) {
                    this.contractDetails.push(ko.mapping.fromJS(data.wfContractDetailInfoes[i]));
                }
                this._fillPriceInfo(data);
            },
            toConnectContractJson: function () {
                var data = ko.mapping.toJS(this.connectedContract.data);
                data.contractType = models.Enums.ContractType.NormalContract;
                data.priceMakingType = this.priceMakingType();
                data.commodityId = this.selectedCommodity();
                data.unitId = models.findUnitId(data.commodityId);
                data.signDate = this.selectedSignDate();
                data.wfContractDetailInfoes = ko.mapping.toJS(this.contractDetails);
                this._paymentOptionToJson(data);
                this._priceInfoToJson(data);
                var result = {
                    contract: data,
                    wfContractDetailInfoes: data.wfContractDetailInfoes,
                    wfPriceInfo: data.wfPriceInfo,
                    key: options.loadKey
                };
                data.wfContractDetailInfoes = null;
                data.wfPriceInfo = null;
                return result;
            },
            _setCurrency: function (priceMarket) {
                var item = models.findById(models._AllExchanges, priceMarket);
                if (item) {
                    this.connectedContract.data.currencyId(item.currencyId);
                    this.currencyDisabled(true);
                } else {
                    this.currencyDisabled(false);
                }
            },
            onSave: function () {
                base._postThenBack(options.saveConnectedContractUrl, this.toConnectContractJson());
            },
            onSaveAndReqestApprove: function () {
                base._post(options.saveConnectedContractUrl, this.toConnectContractJson(), function (result) {
                    if (result.data.approvable) {
                        location.href = options.requestCreateUrl + '?' + $.param({
                            objectId: result.data.wfContractInfoId,
                            flowType: models.Enums.ApprovalType.Contract,
                            commodityId: result.data.commodityId,
                            redirect: options.indexUrl
                        });
                    } else {
                        utils.alert('保存成功，此单据不支持审批。', base._back);
                    }
                });
            }
        };
        $.extend(this, _methods);
    };
};
ns.ConnectedContractViewModel.prototype = new ns.CommodityContractViewModel();
ns.ConnectedContractViewModel.prototype.constructor = ns.ConnectedContractViewModel;
