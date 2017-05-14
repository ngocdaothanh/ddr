define('ddr.parser.table', ['underscore', 'plite'], function(_, plite) {

    function HtmlTable(header, rows, table) {
        var self = this;
        this.deferred = $.Deferred();
        this.table = table;
        this.columnNames = _.map(header, function(td) {return $(td).text();});
        this.columns = _.map(this.columnNames, function(column) {return column.toLowerCase();});
        this.rows = _.map(rows, function(row) {
            return _.object(_.map($(row).children(), function(td, i) {
                return [self.columns[i], $(td)];
            }));
        });
        this.deferred.resolve(this);
    }

    function resolve_table(table, resolve) {
        var observer = new MutationObserver(function(changes){
            for (var i = 0; i < changes.length; i++) {
                if (changes[i].addedNodes.length > 0) {
                    resolve(parseTable(table));
                    observer.disconnect();
                }
            }
        });
        observer.observe($(table).find("tbody").first()[0], {childList: true, subTree: true });
    }

    function parseTable(el) {
        var rows = el.find("tbody>tr");
        var headers = el.find("thead>tr");

        if (headers.length > 0) {
            return plite.resolve(new HtmlTable(
                    headers.first().children(),
                    rows,
                    el
            ));
        } else if (rows.length >= 2) {
            // Try to use the 1st row as header

            // As of v5.6.23, confluence-jira-plugin outputs the first row as empty
            // <tr></tr>, we need to skip it
            var header = rows.first().children();
            while (rows.length >= 2 && header.length == 0) {
                rows = rows.slice(1);
                header = rows.first().children();
            }

            if (header.length == 0) {
                // Same as below
                return plite(function(resolve) {resolve_table(el, resolve)});
            }

            return plite.resolve(new HtmlTable(
                header,
                rows.slice(1),
                el
            ));
        } else {
            return plite(function(resolve) {resolve_table(el, resolve)});
        }
    }

    return {
        parseTable: parseTable
    };
});