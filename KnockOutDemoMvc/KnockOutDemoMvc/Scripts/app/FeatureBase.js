/**
 * Created with JetBrains WebStorm.
 * User: dawson.liu
 * Date: 13-9-5
 * Time: 下午1:17
 * To change this template use File | Settings | File Templates.
 */

var GMK = GMK || {};
GMK.Features = GMK.Features || {};

function normalize(data, properties, keep) {
    $.each(properties, function (i, item) {
        if (data[item] != undefined) data[item.toTitleCase()] = data[item];
        if (keep !== true) delete data[item];
    });
}

function normalizeMessage(data) {
    normalize(data, ['Status', 'Message', 'ReturnStatus'], true);
}
function normalizePagination(pagination) {
    normalize(pagination, ['CurrentPage', 'PageCount', 'PageSize', 'TotalCount']);
}
function normalizeData(data) {
    normalize(data, ['Data'], true);
}

GMK.Features.FeatureBase = {
    _showSpinner: function (callback) {
        var spinner = document.getElementById('page-spinner');
        if (spinner) {
            spinner.style.display = 'block';
        }
        if (callback) {
            setTimeout(callback, 0);
        }
    },
    _hideSpinner: function (callback) {
        var spinner = document.getElementById('page-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        if (callback) {
            setTimeout(callback, 0);
        }
    },
    _preProcessUrl: function (path) {
        if (/^\//g.test(path)) return path;

        //if (path[0] == '/') path = path.substr(1);

        return window.GMK.Context.RootUrl + path;

    },
    _get: function (url, query, callback, autoFormat) {
        $('#page-spinner').show();
        utils.flickAlert('');
        query = query || {};
        if (autoFormat == undefined) autoFormat = true;

        return $.getJSON(this._preProcessUrl(url), query, function (result) {
            normalizeMessage(result);
            $('#page-spinner').hide();
            if (result.status !== undefined && !result.status) {
                alertify.alert('请求失败：' + result.message).show();
            } else {
                normalizeData(result);
                if (callback) callback(result);
                if (autoFormat) utils.autoFormatString();
            }
            //}).always(function () {
            //    $('#page-spinner').hide();
        }).fail(function () {
            $('#page-spinner').hide();
        });
    },
    _post: function (url, query, callback, autoFormat, dataType, onfail) {
        $('#page-spinner').show();
        utils.flickAlert('');
        if (autoFormat !== false) autoFormat = true;
        return $.ajax({
            type: 'POST',
            url: this._preProcessUrl(url),
            data: ko.toJSON(query),
            dataType: dataType || 'json',
            contentType: "application/json",
            success: function (result) {
                normalizeMessage(result);
                $('#page-spinner').hide();
                if (result.status !== undefined && !result.status) {
                    if (utils && utils.alert) {
                        utils.alert('操作失败：' + result.message, function () {
                            if (onfail) {
                                onfail(result);
                            }
                        });
                    } else {
                        alert('操作失败：' + result.message);
                        if (onfail) {
                            onfail(result);
                        }
                    }
                } else {
                    utils.flickAlert((result.returnStatus == 2) ? result.message : (result.message || '操作成功'));
                    normalizeData(result);
                    if (callback) callback(result);
                    if (autoFormat) utils.autoFormatString();
                }
            },
            error: function () {
                $('#page-spinner').hide();
                alert("服务出错，请联系管理员");
                //},
                //complete: function () {
                //    $('#page-spinner').hide();
            }
        });
    },
    _postThenBack: function (url, query, callback, autoFormat, dataType) {
        var _back = this._back;
        this._post(this._preProcessUrl(url), query, function (result) {
            Cookies.set('alert-message', (result.returnStatus == 2) ? result.message : (result.message || '操作成功'));
            if (callback) callback(result);
            _back();
        }, autoFormat, dataType);
    },
    _save: function (url, data, onsuccess, onfail) {
        $('#page-spinner').show();
        utils.flickAlert('');
        return $.ajax({
            type: 'POST',
            url: this._preProcessUrl(url),
            data: ko.toJSON(data),
            contentType: "application/json",
            success: function (result) {
                normalizeMessage(result);
                $('#page-spinner').hide();
                if (!result.status) {
                    alert('保存失败：' + result.message);
                    if (onfail) onfail(result);
                } else {
                    utils.flickAlert((result.returnStatus == 2) ? result.message : (result.message || '保存成功'));
                    if (onsuccess) onsuccess(result);
                }
            },
            error: function () {
                $('#page-spinner').hide();
                alert("服务出错，请联系管理员");
                //},
                //complete: function () {
                //    $('#page-spinner').hide();
            }
        });
    },
    _saveThenBack: function (url, data, onsuccess, onfail) {
        var _back = this._back;
        this._save(this._preProcessUrl(url), data, function (result) {
            Cookies.set('alert-message', (result.returnStatus == 2) ? result.message : (result.message || '保存成功'));
            if (onsuccess) onsuccess(result);
            _back();
        }, onfail);
    },
    _back: function () {
        History.back();
        setTimeout(function () {
            window.close();
        }, 500);
    },
    _delete: function (url, data, onsuccess, onfail, autoFormat) {
        if (autoFormat == undefined) autoFormat = true;
        var self = this;
        confirm('确认删除操作？', function () {
            $('#page-spinner').show();
            utils.flickAlert('');
            return $.ajax({
                type: 'POST',
                url: self._preProcessUrl(url),
                data: ko.toJSON(data),
                dataType: 'json',
                contentType: "application/json",
                success: function (result) {
                    normalizeMessage(result);
                    $('#page-spinner').hide();
                    if (!result.status) {
                        alert('操作失败：' + result.message);
                        if (onfail) onfail(result);
                    } else {
                        utils.flickAlert((result.returnStatus == 2) ? result.message : (result.message || '删除成功'));
                        if (onsuccess) onsuccess(result);
                        if (autoFormat) utils.autoFormatString();
                    }
                },
                error: function () {
                    $('#page-spinner').hide();
                    alert("服务出错，请联系管理员");
                    //},
                    //complete: function () {
                    //    $('#page-spinner').hide();
                }
            });
        });
    },
    _paginateOptions: {
        display: 10,
        border: false,
        text_color: '#08c',
        background_color: '#fefefe',
        border_hover_color: '#ccc',
        text_hover_color: '#727272',
        background_hover_color: '#dbdbdb',
        images: false,
    },
    _paginate: function ($elem, pagination, queryCallback, searchUrl, fillCallback, paramCallback) {
        normalizePagination(pagination);
        if (pagination.currentPage > pagination.pageCount) pagination.currentPage = Math.max(1, pagination.pageCount);
        function buildQuery(currentPage) {
            var query = queryCallback ? queryCallback() : {};
            if (paramCallback) {
                query = paramCallback(query, { currentPage: currentPage, pageSize: pagination.pageSize });
            } else {
                query.pagination = { currentPage: currentPage, pageSize: pagination.pageSize };
            }
            if (query.pagination) delete query.Pagination;
            return query;
        }
        var query = buildQuery(pagination.currentPage);
        store.set('query', query);
        utils.rebuildUrl(query);
        var unfolds = store.get('unfolds');
        if (unfolds) {
            // find the cell and click
            for (var i = 0, length = unfolds.length; i < length; i++) {
                (function (i) {
                    setTimeout(function () {
                        $('#' + unfolds[i] + ' td:nth-child(2)').trigger('click');
                        store.remove('unfolds');
                    }, 0);
                })(i);
            }
        }
        var row = store.get('row');
        if (row) {
            setTimeout(function () {
                row = '#' + row;
                (function checkElemExisting(tries) {
                    if (tries <= 0) return;
                    tries--;
                    if ($(row).length == 0) setTimeout(checkElemExisting, 200);
                    else {
                        var rowElem = $(row), origBackgroundColor = rowElem.css('background-color') || 'transparent';
                        rowElem.animate({ 'background-color': '#f7f6be' }, 'fast').animate({ 'background-color': origBackgroundColor }, 3000);
                    }
                })(30);
                store.remove('row');
            }, 10);
        }
        $elem.paginate($.extend({}, GMK.Features.FeatureBase._paginateOptions, {
            count: pagination.pageCount,
            start: pagination.currentPage,
            display: pagination.pageSize,
            itemCount: pagination.totalCount,
            onChange: function (page, begin, pageSize) {
                if (page == pagination.currentPage && pageSize == pagination.pageSize) {
                    return;
                }
                GMK.Features.FeatureBase._paginateOptions.begin = begin;
                pagination.pageSize = pageSize;
                var query = buildQuery(page);
                // Use post method here due to the Pagination is a complex property, get method will not serialize it.
                utils.responseStateChange(false);
                GMK.Features.FeatureBase._get(searchUrl, query, function (data) {
                    normalizeData(data);
                    var p = data.pagination || data.data.pagination;
                    if (p) normalizePagination(p);
                    if (paramCallback) {
                        query = paramCallback(query, $.extend({}, data.pagination || data.data.pagination));
                    } else {
                        query.pagination = $.extend({}, data.pagination || data.data.pagination);
                    }
                    store.set('query', query);
                    utils.rebuildUrl(query);
                    //utils.setUrlQuery(query);
                    fillCallback(data);
                }, true);

            }
        }));
    },
    _p: function (pagination, searchUrl, fillCallback, queryCallback) {
        GMK.Features.FeatureBase._paginate($('#gmk-pager'), pagination, queryCallback || function () {
            return utils.serialize("#searchForm .gmk-data-field");
        }, searchUrl, fillCallback);
    },
    _pagination: function () {
        var options = arguments.length === 1 ? arguments[0] : {
            $elem: arguments[0],
            pageCount: arguments[1],
            itemCount: arguments[2],
            pageSize: arguments[5],
            currentPage: arguments[3],
            changePage: arguments[4]
        };
        var pageCount = utils.round(+options.pageCount),
            currentPage = utils.round(+options.currentPage),
            itemCount = utils.round(+options.itemCount),
            originalPageSize = utils.round(+options.pageSize),
            $elem = options.$elem,
            changePage = options.changePage;
        if (!$.isNumeric(pageCount) || pageCount < 1) {
            pageCount = 1;
        }
        if (!$.isNumeric(currentPage) || currentPage < 1 || currentPage > pageCount) {
            currentPage = 1;
        }
        if (!$.isNumeric(itemCount) || itemCount < 0) {
            itemCount = 0;
        }
        if (!$.isNumeric(originalPageSize) || originalPageSize < 1) {
            originalPageSize = 1;
        }
        var beginPage = Math.min(currentPage - (currentPage - 1) % 10, Math.max(pageCount - 9, 1));
        $elem.paginate($.extend({}, GMK.Features.FeatureBase._paginateOptions, {
            begin: beginPage,
            count: pageCount,
            start: currentPage,
            itemCount: itemCount,
            display: originalPageSize,
            onChange: function (page, b, pageSize) {
                var newPage = Math.max(utils.round((+page)), 1);
                var newPageSize = Math.max(utils.round((+pageSize)), 1);
                if (newPage != currentPage || newPageSize != originalPageSize) {
                    changePage(newPage, newPageSize);
                }
            }
        }));
    }
};

GMK.Features.CommonModels = function (callback) {
    if (!callback) return;

    var self = this;
    var defaults = {
        decimalDigits: 2,
        weightDigits: 4
    };
    self.settings = self.settings || {};
    $.extend(self.settings, defaults);
   // BigDecimal.prototype.plainMC.digits = 30;

    var ajax = GMK.Features.FeatureBase;
    //since the common models are so big, so cache it; but do not cache any other thing
    //$.ajaxSetup({
    //    cache: true
    //});
  
    //        param.bussinessParam = $.extend({
    //            forUser: false,
    //            forContext: false,
    //            tradeType: null,
    //            corporationId: null,
    //            commodityId: null,
    //            departmentId: null
    //        }, param.bussinessParam);
    //        var businesses = models.ListBusinesses(param.bussinessParam);
    //        var businessIds = $.map(businesses, function (r) {
    //            return r.id;
    //        });
  
    //    models.ListCorporations = function (param) {
    //        param = $.extend({
    //            forBusiness: true
    //        }, param);
    //        var businesses = models.ListBusinesses(param);
    //        var ids = $.map(businesses, function (r) {
    //            return r.corporationId;
    //        });
    //        return $.grep(models._AllCorporations, function (r) {
    //            return (!param.forBusiness || $.inArray(r.id, ids) !== -1);
    //        });
    //    };
 
 
    
    //    models.AllAccountEntities = models.AllAccountingEntities;
};

GMK.Features.CommonModels.onReady = function (callback) {
    new GMK.Features.CommonModels(callback);
};

GMK.Features.CommonListViewModel = function (paramOptions) {
    var defaultOptions = {
        toqueryMappingFromJS: ko.mapping.fromJS,
        toqueryMappingToJS: ko.mapping.toJS,
        setUrl: function (params) {
            var urlParams = utils.getCleanedEmpty(params);
            var url = location.pathname + '?' + $.param(urlParams, true);
            history.replaceState(null, null, url);
        },
        getPageSummary: function (items) {
            return {};
        },
        getList: function (result) {
            return result.Data.list || [];
        },
        getPagination: function (result) {
            return result.Data.pagination || {};
        },
        getSummary: function (result) {
            return result.Data.summary || {};
        },
        mapItem: function (r) {
            return r;
        },
        afterSearch: function (result) {
        },
        pagerElem: '#pager'
    };
    var options = $.extend({}, defaultOptions, paramOptions);
    var route = options.route;
    var self = this;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.loaded = ko.observable(false);
    self.toquery = options.toqueryMappingFromJS(route.values.query);
    self.queried = ko.observable({});
    self.setUrl = options.setUrl || function () { };
    self.resultPagination = ko.observable({});
    self.resultSummary = ko.observable({});
    self.pageSummary = ko.computed(function () {
        return options.getPageSummary(self.items());
    });
    self.search = function (params, callback) {
        base._get(options.searchUrl + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            self.loaded(true);
            if (callback) {
                callback();
            }
            options.afterSearch(result);
        });
    };
    self.fill = function (result) {
        var list = $.map(options.getList(result), options.mapItem);
        self.items(list);
        self.resultPagination(options.getPagination(result));
        self.resultSummary(options.getSummary(result));
        base._pagination($(options.pagerElem), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
    };
    self.changePage = function (newPage, pageSize) {
        var params = self.queried();
        var currPageSize = +self.toquery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.toquery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        self.search(params);
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = options.toqueryMappingToJS(self.toquery);
        self.search(params);
    };
    self.initialize = function (callback) {
        callback();
        var params = options.toqueryMappingToJS(self.toquery);
        self.search(params);
    };
    self.reload = function (callback) {
        var params = self.queried();
        self.search(params, callback);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, options.getDeleteParam(item), function () {
            self.reload();
        });
    };
};
