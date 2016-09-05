# Module: Yahoo Weather Forecast
The `yahooweather` module was built for the MagicMirror.
This module displays the weather forecast for the coming week, including an icon to display the current conditions, the minimum temperature and the maximum temperature. This is a version of the weatherforecast default version, with the same styles and icons but retrieves data from a different source (Yahoo).

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
        module: 'yahooweather',
        position: 'top_right',  // This can be any of the regions.
                                    // Best results in left or right regions.
        config: {
            // See 'Configuration options' for more information.
            location: 'Porto,Portugal',
            locationID: '', //Location ID from Yahoo
        }
    }
]
````

