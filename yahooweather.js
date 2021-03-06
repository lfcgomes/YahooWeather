/* global Module */

/* Magic Mirror
 * Module: YahooWeather (Forecast)
 *
 * By Luís Gomes
 * MIT Licensed.
 */

Module.register("yahooweather",{

    // Default module config.
    defaults: {
        location: "",
        locationID: "",
        appid: "",
        units: config.units,
        maxNumberOfDays: 7,
        updateInterval: 10 * 60 * 1000, // every 10 minutes
        animationSpeed: 1000,
        timeFormat: config.timeFormat,
        lang: config.language,
        fade: true,
        fadePoint: 0.25, // Start on 1/4th of the list.

        initialLoadDelay: 2500, // 2.5 seconds delay.
        retryDelay: 2500,

        apiVersion: "v1",
        apiBase: "https://query.yahooapis.com/",
        forecastEndpoint: "public/yql"
    },

    // Define required scripts.
    getScripts: function() {
        return ["moment.js"];
    },

    // Define required scripts.
    getStyles: function() {
        return ["weather-icons.css", "yahooweather.css"];
    },

    // Define required translations.
    getTranslations: function() {
        // The translations for the defaut modules are defined in the core translation files.
        // Therefor we can just return false. Otherwise we should have returned a dictionairy.
        // If you're trying to build yiur own module including translations, check out the documentation.
        return false;
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);

        // Set locale.
        moment.locale(config.language);

        this.forecast = [];
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);

        this.updateTimer = null;

    },

    // Override dom generator.
    getDom: function() {

        var wrapper = document.createElement("div");

        if (this.config.location === "") {
            wrapper.innerHTML = "Please set the Yahoo <i>location</i> in the config for module: " + this.name + ".";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.translate('LOADING');
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small";

        for (var f in this.forecast) {
            var forecast = this.forecast[f];

            var row = document.createElement("tr");
            table.appendChild(row);

            var dayCell = document.createElement("td");
            dayCell.className = "day";
            dayCell.innerHTML = forecast.day;
            row.appendChild(dayCell);

            var iconCell = document.createElement("td");
            iconCell.className = "bright weather-icon";
            row.appendChild(iconCell);

            var icon = document.createElement("span");
            icon.className = forecast.icon;
            iconCell.appendChild(icon);

            var maxTempCell = document.createElement("td");
            maxTempCell.innerHTML = forecast.maxTemp;
            maxTempCell.className = "align-right bright max-temp";
            row.appendChild(maxTempCell);

            var minTempCell = document.createElement("td");
            minTempCell.innerHTML = forecast.minTemp;
            minTempCell.className = "align-right min-temp";
            row.appendChild(minTempCell);

            if (this.config.fade && this.config.fadePoint < 1) {
                if (this.config.fadePoint < 0) {
                    this.config.fadePoint = 0;
                }
                var startingPoint = this.forecast.length * this.config.fadePoint;
                var steps = this.forecast.length - startingPoint;
                if (f >= startingPoint) {
                    var currentStep = f - startingPoint;
                    row.style.opacity = 1 - (1 / steps * currentStep);
                }
            }

        }
        return table;
    },

    /* updateWeather(compliments)
     * Requests new data from openweather.org.
     * Calls processWeather on succesfull response.
     */
    updateWeather: function() {
        var url = this.config.apiBase + this.config.apiVersion + "/" + this.config.forecastEndpoint + this.getQueryParam();

        var self = this;
        var retry = true;

        var weatherRequest = new XMLHttpRequest();
        weatherRequest.open("GET", url, true);
        weatherRequest.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processWeather(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.config.appid = "";
                    self.updateDom(self.config.animationSpeed);

                    Log.error(self.name + ": Incorrect APPID.");
                    retry = false;
                } else {
                    Log.error(self.name + ": Could not load weather.");
                }

                if (retry) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        weatherRequest.send();
    },

    /* getQueryParams(compliments)
     * Generates an url with api parameters based on the config.
     *
     * return String - URL params.
     */
    getQueryParam: function() {
        var query = "";
        if(this.config.locationID !== "")
            query += "select item from weather.forecast where woeid='" + this.config.locationID + "'";
        else
            query += "select item from weather.forecast where woeid in (select woeid from geo.places(1) where text='" + 
            this.config.location + "')";

        if(this.config.units === "metric")
            query += " and u='c'";

        var escapedParams = "?q="+escape(query) + "&format=json";

        return escapedParams;
    },

    /* processWeather(data)
     * Uses the received data to set the various values.
     *
     * argument data object - Weather information received form openweather.org.
     */
    processWeather: function(data) {

        if(data.query.results){
            var forecastArray = data.query.results.channel.item.forecast;
            this.forecast = [];
            for (var i = 0, count = forecastArray.length; i < count; i++) {

                var forecast = forecastArray[i];
                this.forecast.push({
                    day: moment(forecast.date, "DD MMM YYYY").format("ddd"),
                    icon: "wi wi-yahoo-" + forecast.code,
                    maxTemp: this.roundValue(forecast.high),
                    minTemp: this.roundValue(forecast.low)
                });
            }
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    },

    /* scheduleUpdate()
     * Schedule next update.
     *
     * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(function() {
            self.updateWeather();
        }, nextLoad);
    },

    /* ms2Beaufort(ms)
     * Converts m2 to beaufort (windspeed).
     *
     * argument ms number - Windspeed in m/s.
     *
     * return number - Windspeed in beaufort.
     */
    ms2Beaufort: function(ms) {
        var kmh = ms * 60 * 60 / 1000;
        var speeds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117, 1000];
        for (var beaufort in speeds) {
            var speed = speeds[beaufort];
            if (speed > kmh) {
                return beaufort;
            }
        }
        return 12;
    },

    /* function(temperature)
     * Rounds a temperature to 1 decimal.
     *
     * argument temperature number - Temperature.
     *
     * return number - Rounded Temperature.
     */
    roundValue: function(temperature) {
        return parseFloat(temperature).toFixed(1);
    }
});
