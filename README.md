# k-value

k-value is a fully integrated promise based library that allows you to store data in a Map-like API through persistent backend adapters to multiple different database drivers.

## Installation

Using your preferred Node.js Package Manager. In the following commands, we will be using npm:

```bash
npm install k-value
```

The k-value library allows you to dynamically select your adapter you wish to use. It offers multiple peer dependencies that allow you to install only the adapter you wish to use to keep the project lightweight and flexible.

MySQLAdapter: `npm install mysql2`
SQLiteAdapter: `npm install better-sqlite2`

## Examples

We have extensive examples on every adapter supplied by our library available on our [GitHub Wiki](https://github.com/amethyst-studio/k-value/wiki).
If you are ever having any trouble, I would greatly recommend visiting the Wiki or opening a discussion to ask us questions directly. Issues will be converted to discussions if they do not follow the pre-determined issue templates.

## API Documentation

You can find our TSDoc API documentation available at our [GitHub Pages](https://amethyst-studio.github.io/k-value/index.html).

Simply find the respective adapter you are trying to use and it will reference all the possible information and options that adapter can use.
For example, with the MySQLAdapter the constructor will use the `MySQL2Options` which you can find at [API#MySQL2Options](https://amethyst-studio.github.io/k-value/interfaces/mysql2options.html) in order to allow the `Adapter#configure()` method to resolve correctly and initialize the connections.

## Contributing

Pull requests are always welcome for all of our projects. If you have an adapter you would like to see, you can either create it yourself and copy one of our existing tests or create an issue and we will gladly look into adding support for you.
If you intend to provide any underlying changes to the API, please open a discussion first so we can collaborate on the changes you intend to integrate to ensure data consistency. Pull Requests may be delayed or rejected if you do not reach out first and create significant changes.

## Code of Conduct

You can find more information on the Code of Conduct by visiting [Contributor Covenant's](https://www.contributor-covenant.org/) Official Website.

## License
[MIT](https://choosealicense.com/licenses/mit/)
