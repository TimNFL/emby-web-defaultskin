﻿define(['cardBuilder', 'loading', 'connectionManager', 'apphost', 'layoutManager', 'scrollHelper', 'focusManager', 'emby-itemscontainer', 'emby-scroller'], function (cardBuilder, loading, connectionManager, appHost, layoutManager, scrollHelper, focusManager) {
    'use strict';

    function enableScrollX() {
        return !layoutManager.desktop;
    }

    function MusicSuggestionsTab(view, params) {
        this.view = view;
        this.params = params;
        this.apiClient = connectionManager.getApiClient(params.serverId);
    }

    function initLayout(view) {

        var containers = view.querySelectorAll('.autoScrollSection');

        for (var i = 0, length = containers.length; i < length; i++) {

            var section = containers[i];

            var html;

            if (enableScrollX()) {
                html = '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-framesize="matchgrandparent" data-centerfocus="card"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right"></div></div>';
            } else {
                html = '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap"></div>';
            }

            section.insertAdjacentHTML('beforeend', html);
        }
    }

    function getThumbShape() {
        return enableScrollX() ? 'overflowBackdrop' : 'backdrop';
    }

    function renderLatest(view, items) {

        var section = view.querySelector('.latestSection');
        var container = section.querySelector('.itemsContainer');
        var supportsImageAnalysis = appHost.supports('imageanalysis');
        var cardLayout = supportsImageAnalysis;
        cardLayout = false;

        cardBuilder.buildCards(items, {
            parentContainer: section,
            itemsContainer: container,
            items: items,
            showUnplayedIndicator: false,
            showLatestItemsPopup: false,
            shape: getSquareShape(),
            showTitle: true,
            showParentTitle: true,
            centerText: !cardLayout,
            overlayPlayButton: !cardLayout,
            allowBottomPadding: !enableScrollX(),
            cardLayout: cardLayout,
            vibrant: cardLayout && supportsImageAnalysis,
            coverImage: true
        });

        if (enableScrollX()) {
            section.querySelector('.emby-scroller').scrollToBeginning();
        }
    }

    function renderAlbums(view, items, sectionName, cardOptions) {

        var section = view.querySelector('.' + sectionName);
        var container = section.querySelector('.itemsContainer');
        var supportsImageAnalysis = appHost.supports('imageanalysis');
        var cardLayout = supportsImageAnalysis;
        cardLayout = false;

        cardBuilder.buildCards(items, Object.assign({
            parentContainer: section,
            itemsContainer: container,
            items: items,
            showUnplayedIndicator: false,
            shape: getSquareShape(),
            showTitle: true,
            showParentTitle: true,
            action: 'instantmix',
            centerText: !cardLayout,
            overlayMoreButton: !cardLayout,
            allowBottomPadding: !enableScrollX(),
            cardLayout: cardLayout,
            vibrant: cardLayout && supportsImageAnalysis,
            coverImage: true

        }, cardOptions || {}));

        if (enableScrollX()) {
            section.querySelector('.emby-scroller').scrollToBeginning();
        }
    }

    MusicSuggestionsTab.prototype.onBeforeShow = function (options) {

        var apiClient = this.apiClient;

        if (!options.refresh) {
            this.promises = null;
            return;
        }

        var promises = [];
        var parentId = this.params.parentId;
        var limit = enableScrollX() ? 24 : 12;

        promises.push(apiClient.getLatestItems({

            IncludeItemTypes: "Audio",
            Limit: limit,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            ParentId: parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false

        }));

        promises.push(apiClient.getItems(apiClient.getCurrentUserId(), {

            SortBy: "DatePlayed",
            SortOrder: "Descending",
            IncludeItemTypes: "Audio",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,CanDelete",
            Filters: "IsPlayed",
            ParentId: parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false

        }));

        promises.push(apiClient.getItems(apiClient.getCurrentUserId(), {

            SortBy: "PlayCount",
            SortOrder: "Descending",
            IncludeItemTypes: "Audio",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,CanDelete",
            Filters: "IsPlayed",
            ParentId: parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false
        }));

        promises.push(apiClient.getArtists(apiClient.getCurrentUserId(), {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            Filters: "IsFavorite",
            StartIndex: 0,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false
        }));

        promises.push(apiClient.getItems(apiClient.getCurrentUserId(), {

            SortBy: "Random",
            IncludeItemTypes: "MusicAlbum",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,CanDelete",
            Filters: "IsFavorite",
            ParentId: parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false
        }));

        promises.push(apiClient.getItems(apiClient.getCurrentUserId(), {

            SortBy: "Random",
            IncludeItemTypes: "Audio",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,CanDelete",
            Filters: "IsFavorite",
            ParentId: parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary",
            EnableTotalRecordCount: false
        }));

        this.promises = promises;
    };

    function getSquareShape() {
        return enableScrollX() ? 'overflowSquare' : 'square';
    }

    MusicSuggestionsTab.prototype.onShow = function (options) {

        var promises = this.promises;
        if (!promises) {
            return;
        }

        var view = this.view;

        if (!this.initComplete) {
            this.initComplete = true;
            initLayout(view);
        }

        this.promises = [];

        promises[0].then(function (result) {
            renderLatest(view, result);
            return Promise.resolve();
        });

        promises[1].then(function (result) {
            renderAlbums(view, result.Items, 'recentlyPlayedSection');
            return Promise.resolve();
        });

        promises[2].then(function (result) {
            renderAlbums(view, result.Items, 'frequentlyPlayedSection');
            return Promise.resolve();
        });

        promises[3].then(function (result) {
            renderAlbums(view, result.Items, 'favoriteArtistsSection', {
                showParentTitle: false,
                action: 'play'
            });
            return Promise.resolve();
        });

        promises[4].then(function (result) {
            renderAlbums(view, result.Items, 'favoriteAlbumsSection', {
                action: 'play'
            });
            return Promise.resolve();
        });

        promises[5].then(function (result) {
            renderAlbums(view, result.Items, 'favoriteSongsSection');
            return Promise.resolve();
        });

        Promise.all(promises).then(function () {
            if (options.autoFocus) {
                focusManager.autoFocus(view);
            }
        });
    };

    MusicSuggestionsTab.prototype.onHide = function () {

    };

    MusicSuggestionsTab.prototype.destroy = function () {

        this.view = null;
        this.params = null;
        this.apiClient = null;
        this.promises = null;
    };

    return MusicSuggestionsTab;
});