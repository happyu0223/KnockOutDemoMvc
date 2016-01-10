/**
 * User: dawson.liu
 * Date: 13-9-5
 * Time: 上午10:10
 * To change this template use File | Settings | File Templates.
 */

var GMK = GMK || {};
GMK.Settlement = GMK.Settlement || {};
GMK.Settlement.PaymentRecords = GMK.Settlement.PaymentRecords || {};

GMK.Settlement.PaymentRecords.start = function () {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Settlement/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key"),
        contractCode: $routeElem.data("contractcode"),
        corporationId: $routeElem.data("corporationid"),
        requestId: $routeElem.data('requestid')
    };

    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Manage') {
            var viewModel = new GMK.Settlement.PaymentRecords.ManageViewModel(models, {
                contractCode: route.contractCode,
                loadUrl: route.baseUrl + 'GetPaymentRecord?id=' + route.key,
                loadKey: route.key || '0',
                searchUrl: route.baseUrl + 'GetContracts',
                saveUrl: route.baseUrl + 'SavePaymentRecord',
                requestUrl: route.baseUrl + 'GetPaymentRequest',
                listUrl: route.baseUrl + 'PaymentRecords',
                corporationId: route.corporationId,
                requestId: route.requestId
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else {
            var viewModel = new GMK.Settlement.PaymentRecords.ListViewModel(models, {
                contractCode: route.contractCode,
                searchUrl: route.baseUrl + 'ListPaymentRecords',
                deleteUrl: route.baseUrl + 'DeletePaymentRecord',
                editUrl: route.editUrl,
                corporationId: route.corporationId
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            function initialize(query) {
                viewModel.contractCode(query.ContractCode);
                utils.deserialize("#searchForm .gmk-data-field", query);
                viewModel.initialize(query);
            }
            initialize(models.getQuery());
            models.registerStateChange(initialize);
        }
    });
};

GMK.Settlement.PaymentRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contractCode = ko.observable(options.contractCode);
        vm.recordList = ko.observableArray();
        vm.pageSummary = {
            Amount: ko.computed(function () {
                var sum = 0;
                $.each(vm.recordList(), function (i, r) {
                    sum = utils.roundAmount(sum + utils.roundAmount(r.Amount));
                });
                return sum;
            })
        };
        vm.searchSummary = ko.observable({});
        vm.fill = function (result) {
            vm.recordList.removeAll();
            for (var i = 0; i < result.Data.list.length; i++) {
                vm.recordList.push(result.Data.list[i]);
            }
            vm.searchSummary(result.Data.summary);
            base._p(result.Data.pagination, options.searchUrl, vm.fill);
        }
    }

    viewModel.call(this);

    self.onSearch = function () {
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.fill(data);
        }, true);
    };

    self.onEdit = function (item, event) {
        location.href = options.editUrl + '?' + $.param({ id: item.WFAmountRecordId });
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFAmountRecordId }, function () {
            var $elem = $(event.currentTarget).closest('tr');
            if ($elem) {
                $elem.remove();
            }
        });
    };

    self.initialize = function (query) {
        base._get(options.searchUrl, query, function (contracts) {
            self.fill(contracts);
        }, true);
    }
}

GMK.Settlement.PaymentRecords.PaymentRecordsContractModel = function (contract, commonModels) {
    var self = $.extend(this, contract);
    self.Amount = ko.observable();
    self.prd = {};
    self.prd.Weight = ko.observable();
    self.prd.Price = ko.observable();
    self.prd.Percentage = ko.observable(1);
    self.prd.WithPrice = ko.computed(function () {
        return self.ContractType == commonModels.Enums.ContractType.FirePricing || self.ContractType == commonModels.Enums.ContractType.LongContractDetail;
    });
};

GMK.Settlement.PaymentRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contractList = ko.observableArray();
        vm.totalAmount = ko.computed(function () {
            var list = vm.contractList(), total = 0;
            for (var i = 0; i < list.length; i++) {
                total = utils.roundAmount(total + (!list[i].IsBuy ? -1 : 1) * (utils.roundAmount(list[i].Amount()) || 0));
            }
            return total;
        });
        vm.note = ko.observable();
        vm.payPurpose = ko.observable();
        vm.payType = ko.observable();
        vm.selectedCustomer = ko.observable();
        vm.selectedCustomerName = ko.observable();
        vm.selectedCustomerAccounts = ko.observableArray();
        vm.contractCode = ko.observable(options.contractCode);
        vm.selectedCustomerId = ko.observable();
        vm.selectedCustomerId.subscribe(function (newId) {
            vm.selectedCustomer(self._findCompany(newId));
        });
        vm.selectedCustomer.subscribe(function (newCustomer) {
            vm.selectedCustomerAccounts.removeAll();
            if (newCustomer) {
                vm.selectedCustomerName(newCustomer.name);
                $.each(newCustomer.accounts, function (i, item) {
                    vm.selectedCustomerAccounts.push(item);
                });
            } else {
                vm.selectedCustomerName(null);
            }
        });
        vm.selectedAccout = ko.observable();
        vm.PayReceiveDate = ko.observable(moment(0, 'HH').toJSON());
        vm.WFPayRequestId = ko.observable();
        vm.toJson = function () {
            var result = {
                WFAmountRecordId: options.loadKey,
                CustomerId: vm.selectedCustomer().id,
                CompanyBankInfoId: vm.selectedAccout().id,
                Amount: vm.totalAmount(),
                PayPurpose: vm.payPurpose(),
                PayType: vm.payType(),
                Note: vm.note(),
                CorporationId: options.corporationId,
                WFPayRequestId: vm.WFPayRequestId(),
                PayReceiveDate: vm.PayReceiveDate()
            }

            result.WFAmountRecordDetails = [];
            var list = vm.contractList(), total = 0;
            for (var i = 0; i < list.length; i++) {
                if (list[i].Amount()) {
                    result.WFAmountRecordDetails.push({
                        WFContractInfoId: list[i].WFContractInfoId,
                        Amount: parseFloat(list[i].Amount()),
                        Price: list[i].prd.WithPrice() ? list[i].prd.Price() : null,
                        Weight: list[i].prd.WithPrice() ? list[i].prd.Weight() : null,
                        Percentage: list[i].prd.WithPrice() ? list[i].prd.Percentage() : null
                    });
                }
            }

            return result;
        };
        vm.fillContract = function (data) {
            vm.contractList.removeAll();
            for (var i = 0; i < data.length; i++) {
                var item = new GMK.Settlement.PaymentRecords.PaymentRecordsContractModel(data[i], models);
                vm.contractList.push(item);
            }

            if (data.length > 0) {
                //vm.selectedCustomer(self.findById(self.AllCustomers, data[0].CustomerId));
                vm.selectedCustomerId(data[0].CustomerId);
            }
        };
        vm.fillRecord = function (data) {
            var list = vm.contractList();
            for (var i = 0; i < list.length; i++) {
                for (var j = 0; j < data.WFAmountRecordDetails.length; j++) {
                    if (data.WFAmountRecordDetails[j].WFContractInfoId == list[i].WFContractInfoId) {
                        list[i].prd.Price(data.WFAmountRecordDetails[j].Price);
                        list[i].prd.Weight(data.WFAmountRecordDetails[j].Weight);
                        list[i].prd.Percentage(data.WFAmountRecordDetails[j].Percentage);
                        list[i].Amount(data.WFAmountRecordDetails[j].Amount);
                        break;
                    }
                }
            }

            $.each(vm.selectedCustomer().accounts, function (i, item) {
                if (item.id == data.CompanyBankInfoId) return vm.selectedAccout(item);
            });
            vm.payPurpose(data.PayPurpose);
            vm.payType(data.PayType);
            vm.note(data.Note);
            vm.PayReceiveDate(data.PayReceiveDate);
            vm.WFPayRequestId(data.WFPayRequestId);
        };
        vm.fillRequest = function (data) {
            var payRequest = data.PayRequest;
            var list = vm.contractList();
            for (var i = 0; i < list.length; i++) {
                for (var j = 0; j < payRequest.WFPayRequestDetails.length; j++) {
                    if (payRequest.WFPayRequestDetails[j].WFContractInfoId == list[i].WFContractInfoId) {
                        list[i].prd.Price(payRequest.WFPayRequestDetails[j].Price);
                        list[i].prd.Weight(payRequest.WFPayRequestDetails[j].Weight);
                        list[i].prd.Percentage(payRequest.WFPayRequestDetails[j].Percentage);
                        list[i].Amount(payRequest.WFPayRequestDetails[j].Amount);
                        break;
                    }
                }
            }

            vm.payPurpose(payRequest.PayPurpose);
            vm.payType(payRequest.PayType);
            vm.note(payRequest.Note);
            $.each(vm.selectedCustomer().accounts, function (i, item) {
                if (item.id == data.PayRequest.CompanyBankInfoId) return vm.selectedAccout(item);
            });
        }
    };
    viewModel.call(this);

    self.onSearch = function () {
        var query = utils.serialize("#searchForm .gmk-data-field");
        query.CustomerId = self.selectedCustomer() ? self.selectedCustomer().id : 0;
        base._get(options.searchUrl, query, function (data) {
            self.fillContract(data);
        }, true);
    };

    self.onSave = function () {
        var returnUrl = options.listUrl;
        if (options.requestId != '' && options.requestId != undefined) {
            returnUrl = GMK.Context.RootUrl + 'Settlement/PaymentRequests';
        }
        base._saveThenBack(options.saveUrl, self.toJson());
    };

    self.initialize = function () {
        var url = $.url(); // parse the current page URL using jQuery plug in(https://github.com/allmarkedup/purl)
        if (parseInt(options.loadKey) > 0) {
            base._get(options.loadUrl, { ContractCode: options.contractCode }, function (data) {
                self.fillContract(data.Contracts);
                self.fillRecord(data.Record);
            }, true);
        } else if (options.requestId) {
            self.WFPayRequestId(options.requestId);

            base._get(options.requestUrl, {
                id: options.requestId
            }, function (result) {
                var contractQuery = { PaymentRequestId: options.requestId };
                if (!result.Data.WFSettlementRequestlId) {
                    contractQuery.IsBuy = true
                } // 如果不是尾款结算的申请，只用加载采购合同。
                base._get(options.searchUrl, contractQuery, function (contracts) {
                    self.fillContract(contracts);
                    self.fillRequest(result.Data);
                }, true);
            });

        } else {
            base._get(options.searchUrl, { ContractCode: options.contractCode }, function (contracts) {
                self.fillContract(contracts);
            }, true);
        }
    }
}

