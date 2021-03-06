(function () {
    window.pledgeit = window.pledgeit || {};

    window.pledgeit.services = window.pledgeit.services || {};

    window.grubforscrubs = window.grubforscrubs || {};

    window.grubforscrubs.views = window.grubforscrubs.views || {};
}).call(this);

pledgeit.services.LeaderboardService = (function () {

    // --------------------------------------------
    // Constructor
    // --------------------------------------------

	/**
 	* Constructor for the leaderboard services class
	* @constructor
	*/
    function LeaderboardService() {
        this._initialize();
    }


    LeaderboardService.prototype = {

        // --------------------------------------------
        // Properties
        // --------------------------------------------

        _campaignEndpoint: "https://pledgeit.org/api-public/widgets/campaigns",
        _templateEndpoint: "https://pledgeit.org/api-public/widgets/templates",


        // --------------------------------------------
        // Initialization
        // --------------------------------------------

        _initialize: function () {
            if (!String.prototype.endsWith) {
                String.prototype.endsWith = function (searchString, position) {
                    var subjectString = this.toString();
                    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
                        position = subjectString.length;
                    }
                    position -= searchString.length;
                    var lastIndex = subjectString.indexOf(searchString, position);
                    return lastIndex !== -1 && lastIndex === position;
                };
            }
        },


        // --------------------------------------------
        // Public Methods
        // --------------------------------------------

		/**
		 * Get the campaign using the PledgeIt widget API
		 * @param {string}   slug - The campaign slug
		 * @param {function} requestParams - Request parameters object
		 * @param {string}	 requestParams.onSuccess - Callback for when the API call finishes successfully
		 */
        getCampaign: function (slug, requestParams) {
            this._makeRequest(this._campaignEndpoint + "/" + slug, requestParams);
        },

        /**
		 * Get the template using the PledgeIt widget API
		 * @param {string}   slug - The campaign slug
		 * @param {function} requestParams - Request parameters object
		 * @param {string}	 requestParams.onSuccess - Callback for when the API call finishes successfully
		 */
        getTemplate: function (slug, requestParams) {
            this._makeRequest(this._templateEndpoint + "/" + slug, requestParams);
        },

        // --------------------------------------------
        // Private Methods
        // --------------------------------------------

		/**
		 * Get the weekly leaderboard based on the week specified
		 * @param {string} 	 endpoint 					- Endpoint URL for the AJAX request
         * @param {function} requestParams 				- Request parameters object
		 * @param {function} requestParams.onSuccess	- Callback for when the API call finishes successfully
		 */
        _makeRequest: function (endpoint, requestParams) {
            $.ajax({
                crossDomain: true,
                dataType: "json",
                method: "GET",
                contentType: "text/plain",
                url: endpoint,
                success: function (response) {
                    var items = response;

                    if (requestParams.onSuccess) {
                        requestParams.onSuccess(items);
                    }
                }
            });
        }
    };

    return LeaderboardService;
})();

(function ($) {

    $.fn.reOrder = function (array) {
        return this.each(function () {

            if (array) {
                for (var i = 0; i < array.length; i++)
                    array[i] = $('[gs-name="' + array[i] + '"]');

                $(this).empty();

                for (var i = 0; i < array.length; i++)
                    $(this).append(array[i]);
            }
        });
    }
})(jQuery);
var services = pledgeit.services;
var views = grubforscrubs.views;

grubforscrubs.views.MainView = (function () {
    function MainView() {
        this._initialize();
        this._attachEvents();
    }

    MainView.prototype = {
        _$stats: null,
        _$tabpanels: null,
        _leaderboardService: null,

        // --------------------------------------------
        // Initialization
        // --------------------------------------------

        _initialize: function () {
            this._$stats = $('[gs-total]');
            this._$tabpanels = $('[role="tabpanel"]');

            this._leaderboardService = new services.LeaderboardService();

            this._sortRestaurants();

            // Retrieve all leaderboards via the API
            this._getStats();
            this._getRestaurants();

            // Set up selectize
            if (window.Selectize) {
                $('select[selectize]').each($.proxy(function (index, select) {
                    $(select).selectize({
                        onChange: $.proxy(this._handleSortChange, this, select)
                    });
                }, this));
            }

        },

        _attachEvents: function () {
            $('[role="tablist"]').on('click', 'a', $.proxy(this._handleTabClick, this));
        },

        // --------------------------------------------
        // Private Methods
        // --------------------------------------------

        _getStats: function () {
            this._leaderboardService.getTemplate("grub-for-scrubs-hbg", {
                onSuccess: $.proxy(function (response) {
                    this._$stats
                        .text(this._getValue(response.amountRaised))
                        .removeClass("-preload");
                }, this)
            })
        },

        _getRestaurants: function () {

            $("[gs-slug]").each($.proxy(function (index, restaurant) {
                this._leaderboardService.getCampaign(restaurant.getAttribute("gs-slug"), {
                    onSuccess: $.proxy(function (response) {
                        $target = $(restaurant);
                        $target.find("[gs-amount]")
                            .text(this._getValue(response.amountRaised))
                            .removeClass("-preload");

                        $target.find("[gs-message]")
                            .text(function () {
                                var deliveries = Number(restaurant.getAttribute("gs-deliveries"))
                                var raised = Number(response.amountRaised.substring(0, (response.amountRaised.indexOf('.'))).replace(/,/g, ''));
                                var goal = Number(restaurant.getAttribute("gs-goal"));
                                var progress = (raised - (goal * Math.floor(raised / goal))) / goal;
                                if (raised === 0) {
                                    return "Be the first!";
                                } else if (Math.floor(raised / goal) > deliveries) {
                                    return "Awaiting Delivery!"
                                } else if (deliveries > 0 && progress === 0) {
                                    return "Let's do it again!"
                                } else if (progress < .49) {
                                    return "Great start!";
                                } else if (progress < 1) {
                                    return "Almost there!";
                                }
                            })
                            .removeClass("-preload");

                        $target.find("[gs-donate]")
                            .attr("href", response.url + "/donate")
                            .removeClass("-preload");
                    }, this)
                });
            }, this))
        },

        _getSort: function (sort, $list) {
            var items = $list.find("[gs-name]").map(function (index, restaurant) {
                return {
                    amount: parseFloat($(restaurant).find('[gs-amount]').text().replace(/[,\$]/g, '')),
                    name: restaurant.getAttribute("gs-name")
                }
            });

            items.sort(function (a, b) {
                var x = a.name.toLowerCase();
                var y = b.name.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            });

            switch (sort) {
                case "high":
                    items.sort(function (a, b) {
                        return b.amount - a.amount;
                    });
                    break;
                case "low":
                    items.sort(function (a, b) {
                        return a.amount - b.amount;
                    });
                    break;
            }

            return items.map(function (i, r) {
                return r.name;
            });
        },

        _getValue: function (amount) {
            return "$" + Number(parseFloat(amount.replace(/[,\$]/g, '')).toFixed(0)).toLocaleString();
        },

        _sortRestaurants: function () {
            $("[gs-restaurants]").each($.proxy(function (index, list) {
                $list = $(list);
                $list.reOrder(this._getSort('alpha', $list));
                $list
                    .removeClass("-preload");
            }, this));
        },

        // --------------------------------------------
        // Event Handlers
        // --------------------------------------------

        _handleRestaurantSuccess: function (response, $target) {
            $target.find("[gs-amount]")
                .text("$" + response.amountRaised)
                .removeClass("-preload");
        },

        _handleStatSuccess: function (response, $target) {
            $target
                .text("$" + response.amountRaised)
                .removeClass("-preload");
        },

        _handleSortChange: function (target, sort) {
            $list = $(target).closest("section").find("[gs-restaurants]");
            $list.reOrder(this._getSort(sort, $list));
        },

        _handleTabClick: function (event) {
            event.preventDefault()
            $target = $(event.currentTarget)
            $target
                .attr('aria-selected', true)
                .addClass('-selected');
            $siblings = $target.siblings()
            $siblings
                .attr('aria-selected', false)
                .removeClass('-selected');
            this._$tabpanels.filter(function (index, panel) {
                return $(panel).hasClass('-selected')
            }).removeClass('-selected');
            this._$tabpanels.filter(function (index, panel) {
                return ('#' + panel.id) === $target.attr('href')
            }).addClass('-selected');
        }
    };

    return MainView;
})();

$(function () {
    new grubforscrubs.views.MainView();
});