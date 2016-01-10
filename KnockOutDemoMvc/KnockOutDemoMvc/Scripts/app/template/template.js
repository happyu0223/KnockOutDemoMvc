
var GMK = GMK || {};
GMK.Template = GMK.Template || {};

GMK.Template.tinymceOptions = {
    plugins: [
        "advlist autolink autoresize lists link image charmap anchor",
        "searchreplace visualblocks codemirror fullscreen textcolor",
        "pagebreak insertdatetime table contextmenu paste"
    ],
    toolbar: "code | undo redo | styleselect | bold italic | fontselect | fontsizeselect | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
    font_formats: [
        "宋体=新宋体,NSimSun,宋体,SimSun,serif;",
        "微软雅黑=微软雅黑,Microsoft YaHei,sans-serif;",
        "黑体=黑体,SimHei,sans-serif;",
        "楷体=楷体,KaiTi,楷体_GB2312,KaiTi_GB2312,serif;",
        "仿宋体=仿宋,FangSong,仿宋_GB2312,FangSong_GB2312,serif;",
        "Andale Mono=andale mono,times;",
        "Arial=arial,helvetica,sans-serif;",
        "Arial Black=arial black,avant garde;",
        "Book Antiqua=book antiqua,palatino;",
        "Comic Sans MS=comic sans ms,sans-serif;",
        "Consolas=Consolas,monospace;",
        "Courier New=courier new,courier,monospace;",
        "Georgia=georgia,palatino;",
        "Helvetica=helvetica;",
        "Impact=impact,chicago;",
        "Symbol=symbol;",
        "Tahoma=tahoma,arial,helvetica,sans-serif;",
        "Terminal=terminal,monaco,monospace;",
        "Times New Roman=times new roman,times,serif;",
        "Trebuchet MS=trebuchet ms,geneva;",
        "Verdana=verdana,geneva;",
        "Webdings=webdings;",
        "Wingdings=wingdings,zapf dingbats"
    ].join(''),
    menubar: "tools edit insert view format table",
    codemirror: {
        indentOnInit: true,
        path: 'CodeMirror',
        config: {
            lineWrapping: false,
            lineNumbers: true
        }
    },
    content_css: 'Content/main.css,' + 'Content/bootstrap/bootstrap.min.css',
    language: 'zh_CN'
};

GMK.Template.tinymceInlineOptions = {
    selector: ".editable",
    inline: true,
    toolbar: "undo redo",
    menubar: false,
    language: 'zh_CN'
};

GMK.Template.tinymceInline2Options = {
    selector: ".editable",
    inline: true,
    plugins: [
        "advlist autolink lists link image charmap preview anchor",
        "searchreplace visualblocks code fullscreen textcolor",
        "insertdatetime table contextmenu paste"
    ],
    toolbar: "code | undo redo | styleselect | bold italic | fontselect | fontsizeselect | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
    font_formats: [
        "宋体=新宋体,NSimSun,宋体,SimSun,serif;",
        "微软雅黑=微软雅黑,Microsoft YaHei,sans-serif;",
        "黑体=黑体,SimHei,sans-serif;",
        "楷体=楷体,KaiTi,楷体_GB2312,KaiTi_GB2312,serif;",
        "仿宋体=仿宋,FangSong,仿宋_GB2312,FangSong_GB2312,serif;",
        "Andale Mono=andale mono,times;",
        "Arial=arial,helvetica,sans-serif;",
        "Arial Black=arial black,avant garde;",
        "Book Antiqua=book antiqua,palatino;",
        "Comic Sans MS=comic sans ms,sans-serif;",
        "Consolas=Consolas,monospace;",
        "Courier New=courier new,courier,monospace;",
        "Georgia=georgia,palatino;",
        "Helvetica=helvetica;",
        "Impact=impact,chicago;",
        "Symbol=symbol;",
        "Tahoma=tahoma,arial,helvetica,sans-serif;",
        "Terminal=terminal,monaco,monospace;",
        "Times New Roman=times new roman,times,serif;",
        "Trebuchet MS=trebuchet ms,geneva;",
        "Verdana=verdana,geneva;",
        "Webdings=webdings;",
        "Wingdings=wingdings,zapf dingbats"
    ].join(''),
    menubar: "tools edit insert view format table",
    //codemirror: {
    //    indentOnInit: true,
    //    path: 'CodeMirror',
    //    config: {
    //        lineWrapping: false,
    //        lineNumbers: true
    //    }
    //},
    language: 'zh_CN'
};

GMK.Template.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            var viewModel = new GMK.Template.IndexViewModel(commonModels, route, {
                listUrl: route.baseUrl + 'List',
                deleteUrl: route.baseUrl + 'Delete',
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
            viewModel.commonModels.registerQueryFormEvent();
        } else if (route.action === 'Details') {
            var viewModel = new GMK.Template.DetailsViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
        } else if (route.action === 'Create') {
            var viewModel = new GMK.Template.CreateViewModel(commonModels, route, {
                saveUrl: route.baseUrl + 'Create',
                indexUrl: route.baseUrl + 'Index'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        } else if (route.action === 'Edit') {
            var viewModel = new GMK.Template.EditViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get',
                saveUrl: route.baseUrl + 'Edit',
                indexUrl: route.values.fromUrl || (route.baseUrl + 'Index')
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        } else if (route.action === 'Generate') {
            var viewModel = new GMK.Template.GenerateViewModel(commonModels, route, {
                getTemplateUrl: route.baseUrl + 'Get',
                dataSourceGetUrl: route.baseUrl + 'DataSourceGet',
                archiveSaveUrl: route.baseUrl + 'ArchiveSave',
                archiveIndexUrl: route.baseUrl + 'ArchiveIndex'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        } else if (route.action === 'ArchiveIndex') {
            var viewModel = new GMK.Template.ArchiveIndexViewModel(commonModels, route, {
                archiveGetUrl: route.baseUrl + 'ArchiveGet',
                archiveExistsUrl: route.baseUrl + 'ArchiveExists'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
        } else if (route.action === 'ArchiveGenerate') {
            var viewModel = new GMK.Template.ArchiveGenerateViewModel(commonModels, route, {
                listUrl: route.baseUrl + 'List'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        } else if (route.action === 'ArchiveEdit') {
            var viewModel = new GMK.Template.ArchiveEditViewModel(commonModels, route, {});
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};

GMK.Template.ItemViewModel = function (plainItem, commonModels) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    self.CommodityIds = ko.observableArray($.map(self.WFCommodityTemplates(), function (item) {
        return item.WFCommodityId();
    }));
    self.CommodityTexts = ko.computed(function () {
        return $.map($.grep(commonModels.AllCommodities, function (item) {
            return $.inArray(item.id, self.CommodityIds()) !== -1;
        }), function (item) {
            return item.name;
        }).join(', ');
    });
    self.CorporationIds = ko.observableArray($.map(self.WFCorporationTemplates(), function (item) {
        return item.WFCompanyId();
    }));
    self.CorporationTexts = ko.computed(function () {
        return $.map($.grep(commonModels._AllCorporations, function (item) {
            return $.inArray(item.id, self.CorporationIds()) !== -1;
        }), function (item) {
            return item.shortName;
        }).join(', ');
    });
};

GMK.Template.ItemToJs = function (item) {
    var plainItem = ko.mapping.toJS(item);
    plainItem.WFCommodityTemplates = $.map(item.CommodityIds(), function (cId) {
        return { WFCommodityId: cId, WFBillTemplateId: plainItem.WFBillTemplateId };
    });
    delete plainItem.CommodityIds;
    plainItem.WFCorporationTemplates = $.map(item.CorporationIds(), function (cId) {
        return { WFCompanyId: cId, WFBillTemplateId: plainItem.WFBillTemplateId };
    });
    delete plainItem.CorporationIds;
    return plainItem;
};

GMK.Template.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    //self.templateType = ko.observable(route.values.templateType);
    self.query = ko.observable(ko.mapping.fromJS(route.values.query));
    self.currQuery = {};
    self.items = ko.observableArray();
    self.initialize = function () {
        self.search();
    };
    self.search = function (callback) {
        self.currQuery = ko.mapping.toJS(self.query());
        base._get(options.listUrl, self.currQuery, function (result) {
            self.items.removeAll();
            for (var i = 0, l = result.Data.length; i < l; i++) {
                self.items.push(new GMK.Template.ItemViewModel(result.Data[i], commonModels));
            }
            if (callback) {
                callback();
            }
        });
    }
    self.onSearch = function () {
        self.search(function () {
            var param = ko.toJS(self.currQuery);
            utils.cleanEmpty(param);
            history.replaceState(null, null, location.pathname + '?' + $.param(param));
        });
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFBillTemplateId()
        }, function () {
            self.items.remove(item);
        });
    };
};
GMK.Template.DetailsViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.initialize = function () {
    };
};
GMK.Template.CreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.item = ko.observable();
    //self.item(ko.mapping.fromJS(commonModels.NewEntities.WFBillTemplate));
    //self.item(ko.mapping.fromJS(route.values.item));
    self.item(new GMK.Template.ItemViewModel(route.values.item, commonModels));
    self.initialize = function (callback) {
        callback();
    };
    self.onSave = function (mceId) {
        return function () {
            var content = tinymce.get(mceId).getContent();
            self.item().HTMLContent($('<div></div>').append($(content).filter('.archive-multisection, .archive-multipage, .archive-container, .archive-contrainer')).html());

            //var plainItem = ko.mapping.toJS(self.item());
            var plainItem = GMK.Template.ItemToJs(self.item());
            base._postThenBack(options.saveUrl, plainItem);
        };
    };
};
GMK.Template.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = ko.observable();
    //self.item(ko.mapping.fromJS(commonModels.NewEntities.WFBillTemplate));
    self.initialize = function (callback) {
        base._get(options.getUrl, {
            id: self.id
        }, function (result) {
            self.item(new GMK.Template.ItemViewModel(result.Data, commonModels));
            callback();
        });
    };
    self.onSave = function (mceId) {
        return function () {
            var content = tinymce.get(mceId).getContent();
            self.item().HTMLContent($('<div></div>').append($(content).filter('.archive-multisection, .archive-multipage, .archive-container, .archive-contrainer')).html());

            //var plainItem = ko.mapping.toJS(self.item());
            var plainItem = GMK.Template.ItemToJs(self.item());
            base._postThenBack(options.saveUrl, plainItem);
        };
    };
};
GMK.Template.startEdit = function (acc, mceOptions) {
    $('.editable', acc).attr({ contenteditable: true });
    if (tinymce && mceOptions) {
        tinymce.init(mceOptions);
    }
};
GMK.Template.endEdit = function (acc) {
    if (window.tinymce) {
        tinymce.remove();
    }
    $('[data-bind]', acc).removeAttr('data-bind');
    $('[contenteditable]', acc).removeAttr('contenteditable');
    $('.editable', acc).removeAttr('id');
    $('input[type=hidden]', acc).remove();
};
GMK.Template.setRuler = function (acc) {
    if ($('.archive-page-body', acc).length && $('.archive-multipage', acc).length) {
        var headerHeight = $('.archive-page-body', acc).position().top - $(acc).position().top,
            bodyHeight = $('.archive-page-body', acc).height();
        var $ruler = $(acc).siblings('.ruler');
        //$('#ruler-header').height($('.archive-page-body').position().top - $('#generated').position().top);
        $('.ruler-node', $ruler).css('top', headerHeight + bodyHeight);
        $('.archive-page-body-content', acc).bind('DOMSubtreeModified', function () {
            //console.log('resize');
            var i = 0,
                pages = (($('.archive-page-body-content', acc).height() / $('.archive-page-body', acc).height()) | 0) + 1,
                nodes = $('.ruler-node', $ruler).length;
            //if (nodes > pages) {
            for (i = pages; i < nodes; i++) {
                $('.ruler-node', $ruler).last().remove();
            }
            //} else if (nodes < pages) {
            for (i = nodes; i < pages; i++) {
                $('.ruler-node').last().clone().appendTo($ruler)
                    .css('top', headerHeight + (i + 1) * bodyHeight);
            }
            //}
        });
    }
};
GMK.Template.generateMultipage = function (acc) {
    if ($('.archive-multipage', acc).length) {
        $('.archive-page-body', acc).css('overflow-y', 'hidden');
        var bodyContentHeight = $('.archive-page-body-content', acc).height(),
            bodyHeight = $('.archive-page-body', acc).height();
        if (bodyContentHeight > bodyHeight) {
            var i, j, $c;
            for (i = 0; (i + 1) * bodyHeight < bodyContentHeight; i++) {
                $c = $('.archive-container', acc).eq(0);
                $c.clone().insertAfter($c);
            }
            for (j = 0; j < i + 1; j++) {
                $c = $('.archive-container', acc).eq(j);
                var t = 'translateY(' + (-j * bodyHeight) + 'px)';
                $('.archive-page-body-content', $c).css({
                    //'transform-origin': 'left top',
                    'transform': t,
                    '-webkit-transform': t
                });
                //.css('margin-top', (-j * (bodyHeight)) + 'px');
            }
        }
    }
};
GMK.Template.invMultipage = function (acc) {
    if ($('.archive-page-body', acc).length && $('.archive-multipage', acc).length) {
        for (var i = $('.archive-container', acc).length - 1; i > 0; i--) {
            $('.archive-container', acc).eq(i).remove();
        }
        $('.archive-page-body', acc).css('overflow-y', 'visible');
    }
};
GMK.Template.GenerateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.values = route.values;
    self.templateId = route.values.templateId;
    self.templateType = route.values.templateType;
    self.dataSourceId = route.values.dataSourceId;
    self.commodityId = route.values.commodityId;
    self.template = ko.observable();
    self.dataSource = ko.observable();
    self.printable = ko.observable(true);
    self.initialize = function (callback) {
        base._get(options.dataSourceGetUrl, {
            templateType: self.templateType,
            dataSourceId: self.dataSourceId
        }, function (dataSourceResult) {
            self.dataSource = dataSourceResult.Data;
            if (self.dataSource.printable === false) {
                self.printable(false);
                alert('不能打印');
            } else {
                callback();
                var acc = route.values.contentContainer;
                GMK.Template.setRuler(acc);
                GMK.Template.startEdit(acc);
                if (!route.values.isReCreate) {
                    self.onSave();
                }
            }
        });
    };
    self.onSave = function () {
        //return function () {
        //    var archive = {
        //        BillType: self.templateType,
        //        BillId: self.dataSourceId,
        //        BillContent: getContent()
        //    };
        //    base._post(options.archiveSaveUrl, archive, function (result) {
        //        Cookies.set('alert-message', '保存成功');
        //        location.href = options.archiveIndexUrl + '?' + $.param({
        //            dataSourceId: self.dataSourceId,
        //            templateType: self.templateType,
        //            commodityId: route.values.commodityId
        //        });
        //    });
        //};
        var acc = route.values.contentContainer;

        GMK.Template.endEdit(acc);

        GMK.Template.generateMultipage(acc);


        var archiveContent = $(acc).html();

        var archive = {
            BillType: self.templateType,
            BillId: self.dataSourceId,
            BillContent: archiveContent,
            WFBillTemplateId: route.values.templateId
        };
        base._post(options.archiveSaveUrl, archive, function (result) {
            Cookies.set('alert-message', '保存成功');
            location.href = route.archiveIndexUrl + '?' + $.param({
                dataSourceId: self.dataSourceId,
                templateType: self.templateType,
                commodityId: route.values.commodityId
            });
        });
    };
};
GMK.Template.ArchiveEditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.values = route.values;
    self.initialize = function (callback) {
        var acc = route.values.contentContainer;
        $('.editable', acc).removeAttr('id');
        GMK.Template.invMultipage(acc);

        GMK.Template.setRuler(acc);

        GMK.Template.startEdit(acc);
        if(callback)
            callback();
    };
    self.onSave = function () {
        var acc = route.values.contentContainer;

        GMK.Template.endEdit(acc);

        GMK.Template.generateMultipage(acc);

        var content = $(acc).html();
        var archive = {
            BillType: route.values.templateType,
            BillId: route.values.dataSourceId,
            BillContent: content
        };
        base._post('Template/ArchiveSave', archive, function (result) {
            location.href = route.archiveIndexUrl + '?' + $.param({
                dataSourceId: route.values.dataSourceId,
                templateType: route.values.templateType,
                commodityId: route.values.commodityId
            });
        });
    };
};
GMK.Template.ArchiveIndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.templateType = route.values.templateType;
    self.dataSourceId = route.values.dataSourceId;
    self.hasArchive = ko.observable(false);
    //self.archive = ko.observable();
    self.initialize = function (callback) {
        base._get(options.archiveExistsUrl, {
            templateType: self.templateType,
            dataSourceId: self.dataSourceId
        }, function (result) {
            self.hasArchive(!!result.Data);
            //self.archive(ko.mapping.fromJS(result.Data));
            if (callback) {
                callback();
            }
        });
    };
};
GMK.Template.ArchiveGenerateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.dataSourceId = route.values.dataSourceId;
    //self.templateType = route.values.templateType;
    //self.commodityId = route.values.commodityId;
    self.query = {
        TemplateType: route.values.templateType,
        CommodityId: route.values.commodityId,
        CorporationId: route.values.corporationId
    };
    self.items = ko.observableArray();
    self.initialize = function (success) {
        base._get(options.listUrl, self.query, function (result) {
            self.items.removeAll();
            for (var i = 0, l = result.Data.length; i < l; i++) {
                var item = new GMK.Template.ItemViewModel(result.Data[i], commonModels);
                item.generateUrl = route.generateUrl + '?' + $.param({
                    dataSourceId: self.dataSourceId,
                    templateId: item.WFBillTemplateId(),
                    commodityId: route.values.commodityId,
                    isReCreate: route.values.isReCreate
                });
                self.items.push(item);
            }
            if (success) {
                success();
            }
            if (self.items().length === 1) {
                location.href = route.generateUrl + '?' + $.param({
                    dataSourceId: self.dataSourceId,
                    templateId: self.items()[0].WFBillTemplateId(),
                    commodityId: route.values.commodityId,
                    isReCreate: route.values.isReCreate
                });
            }
        });
    };
};
