const mix = require('laravel-mix')
const forIn = require('lodash/forIn')
const jsonfile = require('jsonfile')
const escapeStringRegexp = require('escape-string-regexp')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path')
const DD = '.'

class VersionHash {
    register(options = {}) {
        this.options = Object.assign(
            {
                length: 6,
                delimiter: DD,
                exclude: []
            },
            options
        )

        const delimiter = escapeStringRegexp(this.getDelimiter())
        const mixManifest = `${Config.publicPath}/mix-manifest.json`
        const removeHashFromKeyRegex = new RegExp(delimiter + '(.+)\\.(.+)$', 'g')
        const removeHashFromKeyRegexWithMap = new RegExp(delimiter + '(.+)\\.(.+)\.map$', 'g')

        return mix.webpackConfig().then(() => {
            jsonfile.readFile(mixManifest, (err, obj) => {
                let newJson = {}

                forIn(obj, (value, key) => {
                    key = key.endsWith('.map')
                        ? key.replace(removeHashFromKeyRegexWithMap, '.$2.map')
                        : key.replace(removeHashFromKeyRegex, '.$2')

                    newJson[key] = value
                })

                jsonfile.writeFile(mixManifest, newJson, {spaces: 2}, (err) => {
                    if (err) console.error(err)
                })
            })
        })
    }

    webpackConfig(webpackConfig) {
        const length = this.options.length
        const delimiter = this.getDelimiter()

        // js
        let chunkhash = `[name]${delimiter}[chunkhash:${length}].js`

        webpackConfig.output.filename = chunkhash

        if (webpackConfig.output.chunkFilename) {
            // merge chunkFilename paths
            let directory = path.dirname(webpackConfig.output.chunkFilename)
            webpackConfig.output.chunkFilename = `${directory}/${chunkhash}`
        } else {
            webpackConfig.output.chunkFilename = chunkhash
        }

        // css
        let contenthash = `[contenthash:${length}].css`

        forIn(webpackConfig.plugins, (value, key) => {
            if (value instanceof ExtractTextPlugin && !value.filename.includes(contenthash)) {

                let csspath = value.filename.substring(0, value.filename.lastIndexOf('.'))
                let filename = `${csspath}${delimiter}${contenthash}`

                if (value.filename != filename) {
                    value.filename = filename
                }
            }
        })
    }

    getDelimiter() {
        return this.options.delimiter.replace(/[^\.|\-|_]/g, '') || DD
    }

    exclude(key) {
        return this.options.exclude.includes(key)
    }
}

mix.extend('versionHash', new VersionHash())
