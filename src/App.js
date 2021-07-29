import React, { useState, useEffect, useMemo } from "react";
import Papa from 'papaparse'
import { useTable, useFilters, useGlobalFilter, usePagination } from "react-table";
import styled from 'styled-components'
import { matchSorter } from 'match-sorter'
import Grid from "@material-ui/core/Grid";
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import './index.css';

const Styles = styled.div`
    table {
        border-spacing: 0;
        th,
        td {
            margin: 0;
            padding: 0;
            border: 1px solid black;
            text-align: center;
        }
    }
`

let filtered_rows_count = 0;

 //Define a default UI for filtering
function DefaultColumnFilter({
    column: { filterValue, preFilteredRows, setFilter },
    }) {
    filtered_rows_count = preFilteredRows.length

    return (
        <input
            value={filterValue || ''}
            onChange={e => {
                setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
            }}
            placeholder={''}
            className="text-filter"
        />
    )
}

function DefaultColumnFilterDisabled({
    column: { filterValue, preFilteredRows, setFilter },
    }) {
    filtered_rows_count = preFilteredRows.length

    return (
        <input
            value={filterValue || ''}
            onChange={e => {
                setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
            }}
            placeholder={''}
            className="text-filter"
            disabled
        />
    )
}

function fuzzyTextFilterFn(rows, id, filterValue) {
    return matchSorter(rows, filterValue, { keys: [row => row.values[id]] })
}

// Let the table remove the filter if the string is empty
fuzzyTextFilterFn.autoRemove = val => !val

function Table({ columns, data, showFilter }) {
    const filterTypes = useMemo(
        () => ({
            // Add a new fuzzyTextFilterFn filter type.
            fuzzyText: fuzzyTextFilterFn,
            // Or, override the default text filter to use
            // "startWith"
            text: (rows, id, filterValue) => {
                return rows.filter(row => {
                    const rowValue = row.values[id]
                    return rowValue !== undefined
                        ? String(rowValue)
                        .toLowerCase()
                        .startsWith(String(filterValue).toLowerCase())
                    : true
                })
            },
        }),
        []
    )

    const defaultColumn = useMemo(
        () => ({
            Filter: DefaultColumnFilter,
        }),[]
    )

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        page,
        canPreviousPage,
        canNextPage,
        pageCount,
        gotoPage,
        nextPage,
        previousPage,
        setPageSize,
        state: { pageIndex, pageSize },
        visibleColumns,
        preGlobalFilteredRows,
        setGlobalFilter,
        sortedData,
    } = useTable(
    {
        columns,
        data,
        initialState: { pageSize: 10 },
        defaultColumn, // Be sure to pass the defaultColumn option
        filterTypes,
    },
    useFilters, // useFilters!
    useGlobalFilter, // useGlobalFilter!
    usePagination
    );

    const total_experiments_count = data.length

    /*
    Render the UI for your table
    - react-table doesn't have UI, it's headless. We just need to put the react-table props from the Hooks, and it will do its magic automatically
    */
    return (
        <>
        <div className="pagination">
            <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
                {"<<"}
            </button>{" "}
            <button onClick={() => previousPage()} disabled={!canPreviousPage}>
                {"<"}
            </button>{" "}
            <button onClick={() => nextPage()} disabled={!canNextPage}>
                {">"}
            </button>{" "}
            <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
                {">>"}
            </button>{" "}
            <span>Page{" "}<strong>{pageIndex + 1} of {pageCount}</strong>{" "}</span>
            <span>| Go to page:{" "}
                <input
                    type="number"
                    defaultValue={pageIndex + 1}
                    onChange={(e) => {
                        const page = e.target.value ? Number(e.target.value) - 1 : 0;
                        gotoPage(page);
                    }}
                    className="curr-page"
                />
            </span>{" "}
            <select
                value={pageSize}
                onChange={(e) => {
                    setPageSize(Number(e.target.value));
                }}>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      Show {pageSize}
                    </option>
                ))}
            </select>
            <span class="experiment-count"> Showing <strong>{filtered_rows_count}</strong> of <strong>{total_experiments_count}</strong> experiments</span>
        </div>
        <div class="table-outer">
            <table {...getTableProps()}>
                <thead>
                    {headerGroups.map(headerGroup => (
                    <>
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th {...column.getHeaderProps()}>
                              {column.render('Header')}
                            </th>
                        ))}
                    </tr>
                    {showFilter
                    ? (
                        <tr {...headerGroup.getHeaderGroupProps()} class="bg-col">
                            {headerGroup.headers.map(column => (
                                <th {...column.getHeaderProps()}>
                                    {column.canFilter ? column.render('Filter') : null}
                                </th>
                            ))}
                        </tr>
                    )
                    : (
                      null
                    )}
                    </>
                ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                    {page.map((row, i) => {
                        prepareRow(row);
                        return (
                            <tr {...row.getRowProps()}>
                                {row.cells.map((cell) => {
                                    return (
                                        <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </>
  );
}

function App() {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [showFilter, setShowFilter] = useState(true);
    const [tableLoaded, setTableLoaded] = useState(false);
    const [projectSelection, setProjectSelection] = React.useState('');

    useEffect(() => {
    }, []) // [] means just do this once, after initial render

    function getDataFromCSV(project) {
        let data_file;
        if (project === "simple_mos") {
            data_file = '../dataFile/simple_mos.csv'
        } else if (project === "doe3k") {
            data_file = '../dataFile/doe3k.csv'
        }

        Papa.parse(data_file, {
            header: false,
            download: true,
            complete: results => {
                processCSVData(results.data)
            }
        })
    }

    function processCSVData(result) {
        let csv_row_data = result
        let accessor_list = []
        let col_headers_list = []
        let col = 0
        let tool_key;
        let tool_value;
        let updated_accessor_value = 0;

        const tools_row = result[0]
        const header_row = result[2]
        const data_row = result[3]
        const tool_headers_list = getToolsList(tools_row, header_row);

        const columns_data = tool_headers_list.map((tool_header) => {
            let column_list = []
            Object.keys(tool_header).map((tool) => {
               tool_key = tool
               tool_value = tool_header[tool]
            })

            for (let i=0; i<tool_value; i++) {
                let col_header = header_row[col]
                let value = data_row[col]
                let col_obj = {}

                if (value != null) {
                    if (value === "") {
                        if (col_header !== "") {
                            if (!col_headers_list.includes(col_header)) {
                                col_headers_list.push(col_header)
                                accessor_list.push(col_header)
                                col_obj = {'Header': col_header,
                                    'accessor': col_header,
                                    'Filter': DefaultColumnFilterDisabled }
                            } else {
                                //random_num = Math.floor(Math.random() * 10000)
                                updated_accessor_value = col_header+"_"+generateRandomNumber()
                                accessor_list.push(updated_accessor_value)
                                col_obj = {'Header': col_header,
                                    'accessor': updated_accessor_value,
                                    'Filter': DefaultColumnFilterDisabled }
                            }
                        } else {
                            updated_accessor_value = "tmp_"+generateRandomNumber()
                            col_obj = {'Header': ' ',
                                'accessor': updated_accessor_value,
                                'Filter': DefaultColumnFilterDisabled}
                        }
                    } else {
                        if (!col_headers_list.includes(col_header)) {
                            col_headers_list.push(col_header)
                            accessor_list.push(col_header)
                            //var regExp = /[a-zA-Z]/g;
                            // For now I have disabled the NumberRangeColumnFilter
                            //if(regExp.test(value)) {
                            col_obj = {'Header': col_header,
                            'accessor': col_header,
                            'Filter': DefaultColumnFilter}
//                            } else {
//                                col_obj = {'Header': col_header,
//                                'accessor': col_header,
//                                'Filter': DefaultColumnFilter}
//                                //'Filter': NumberRangeColumnFilter,
//                                //'filter': 'between'}
//                            }
                        } else {
                            updated_accessor_value = col_header+"_"+generateRandomNumber()
                            col_obj = {'Header': col_header,
                                'accessor': updated_accessor_value,
                                'Filter': DefaultColumnFilter}
                        }
                    }
                    column_list.push(col_obj)
                    col++;
                }
            }

            if (tool_key === 'no_header') {
                tool_key = ' '
            }
            return {
                Header: tool_key,
                columns: column_list
            }
        })

        const row_data = getRowDataList(csv_row_data, accessor_list)

        setData(row_data)
        setColumns(columns_data)
    }

    function getToolsList(tools_row, header_row) {
        let tools_list = []
        let current_pos = 0
        let overall_count = 1;
        for (let i=0; i<tools_row.length; i++) {
            if (i === current_pos)  {
                if (tools_row[i] !== "") {
                    let count = 1;
                    for (let j=i; j<tools_row.length; j++) {
                        if (tools_row[j] === tools_row[j+1]) {
                            count++;
                            overall_count++;
                        } else {
                            if (count === 1) {
                                overall_count++;
                            }
                            current_pos=overall_count
                            break;
                        }
                    }
                    let tool_obj = {[tools_row[i]]: count}
                    tools_list.push(tool_obj)
                }
            }
        }
        if (header_row.length > tools_row.length) {
            let count  = 0;
            for (let i=tools_row.length-1; i<header_row.length; i++) {
                count++;
            }
            let tool_obj = {"no_header": count}
            tools_list.push(tool_obj)
        }
        return tools_list
    }

    function getRowDataList(csv_row_data, accessor_list) {
        let id = 1;
        let row_data = []
        for (let i=3; i<csv_row_data.length; i++) {
            let row_data_obj = {}
            let kv_obj = {}
            for (let j=0; j<accessor_list.length; j++) {
                  kv_obj = {[accessor_list[j]]: csv_row_data[i][j]}
                  row_data_obj = Object.assign(row_data_obj, kv_obj);
            }
            kv_obj = {"id": id}
            row_data_obj = Object.assign(row_data_obj, kv_obj);
            kv_obj = {"node_status": "idle"}
            row_data_obj = Object.assign(row_data_obj, kv_obj);
            row_data.push(row_data_obj)
            id++;
        }
        return row_data;
    }

    const generateRandomNumber = () => Math.floor(Math.random() * 10000000)

    const handleProjectSelection = (event, projectSelection) => {
        setProjectSelection(projectSelection);
        getDataFromCSV(projectSelection)
        setTableLoaded(true)
    };

    return (
    <>
    <div>
        <Grid container>
            <Grid item xs={3}>
                <div class="toggle-buttons">
                    <ToggleButtonGroup
                        value={projectSelection}
                        exclusive
                        onChange={handleProjectSelection}>
                        <ToggleButton value="simple_mos" aria-label="Simple MOS">
                            Simple MOS
                        </ToggleButton>
                        <ToggleButton value="doe3k" aria-label="DOE3k">
                            DOE3k
                        </ToggleButton>
                     </ToggleButtonGroup>
                </div>
            </Grid>
            <Grid item xs={6} style={{textAlign: 'center'}}>
                <h2 class="heading">SWB GUI (Table View PoC)</h2>
            </Grid>
            <Grid item xs={3}></Grid>
        </Grid>

        {tableLoaded
        ? (
            <>
            <div class="bg-col">
                <Grid container spacing={2}>
                    <Grid item xs={3} class="node-status-outer">
                        <strong>Node Status:</strong>
                        <select name="node-status" id="node-status-select" class="node-status-select">
                            <option value="">&lt;Select&gt;</option>
                            <option value="1">None</option>
                            <option value="2">Queued</option>
                            <option value="3">Ready</option>
                            <option value="4">Pending</option>
                            <option value="5">Running</option>
                            <option value="6">Done</option>
                            <option value="7">Failed</option>
                            <option value="8">Aborted</option>
                            <option value="9">Virtual</option>
                            <option value="10">Pruned</option>
                            <option value="11">Failed</option>
                        </select>
                    </Grid>
                    <Grid item xs={9}></Grid>
                </Grid>
                <p></p>
            </div>
        <Styles>
            <Table columns={columns} data={data} showFilter={showFilter}/>
        </Styles>
        </>

        )
        : (
        <div class="no-project">
            <h4>No Project loaded. <br/><br/>Please select a project.</h4>
        </div>
        )}
    </div>
    </>
  );
}

export default App;
