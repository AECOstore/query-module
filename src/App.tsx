import * as React from 'react'
import {useState, useEffect} from "react"
import { Button, TextField, FormGroup, FormControlLabel, Checkbox, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'

import { translate } from "sparqlalgebrajs";
import {Catalog} from 'consolid-daapi'
import {Session} from '@inrupt/solid-client-authn-browser'
import { PiletApi } from 'consolid-shell';
import {QueryEngine} from '@comunica/query-sparql'
import { ReferenceRegistry } from 'consolid-raapi';
import registerServiceWorker from 'react-service-worker';

const initialQuery = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
SELECT ?element ?g
WHERE {
 graph ?g {?element a beo:Door .}
}
`;

function streamToString (stream): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}


const App = ({piral} : {piral: PiletApi}) => {
  const constants = piral.getData("CONSTANTS")
  const [query, setQuery] = useState(initialQuery)
  const [queryResults, setQueryResults] = useState([]);
  const [variables, setVariables] = useState([]);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])

  const [session, setSession] = useState(new Session())

  useEffect(() => {
    try {
      const checkedVar = variables
        .filter((variable) => {
          return variable.checked;
        })
        .map((e) => e.name);
      const translation = translate(query);
      setError(null);
      setVariables(
        translation.variables.map((e) => {
          return {
            name: e.value,
            checked: true,
          };
        })
      );
    } catch (error) {
      setError(error.message);
    }
  }, [query]);

  useEffect(() => {
    if (queryResults && queryResults.head) {
      const columnShape = queryResults.head.vars.map((v) => {return {
        field: v,
        headerName: v,
        width: 200,
        editable: true
      }})
      setColumns(prev => [{ field: 'id', headerName: '#', width: 30 }, ...columnShape])
  
      const rowShape = queryResults.results.bindings.map((b, index) => {
        const results = {}
        Object.keys(b).forEach(key => {
          results[key] = b[key].value
        })
        return {
          id: index, 
          ...results
        }
      })
      setRows(prev => rowShape)
    }
  }, [queryResults])

  function extractIdentifiers(bindings) {
    const identifiers = []
    for (const v of variables) {
      if (v.checked) {
        for (const b of bindings)
        identifiers.push(b[v.name].value)
      }

    }
    return identifiers
  }

  async function doQuery() {
    const sess = new Session()
    const p = piral.getData(constants.ACTIVE_PROJECT)
    const projectUrl = p[0].projectUrl
    const refRegUrl = p[0].referenceRegistry

    const project:any = new Catalog(sess, projectUrl)
    const endpoints = await project.aggregateSparqlEndpoints()
    const myEngine = new QueryEngine()
    const res = await myEngine.query(query, {sources: endpoints.map(i => i.satellite)})
    const {data} = await myEngine.resultToString(res, 'application/sparql-results+json')
    const results = await streamToString(data)
    
    const things = JSON.parse(results).results.bindings.map(b => {return {activeDocument: b["g"].value, identifier: b["element"].value}})
    piral.setDataGlobal(constants.SELECTED_REFERENCES, things)
  }


  return (
    <div style={{ margin: 20 }}>
    <TextField
      id="outlined-multiline-flexible"
      label="Query SPARQL"
      fullWidth
      multiline
      minRows={4}
      maxRows={10}
      value={query}
      helperText={error}
      error={error ? true : false}
      onChange={e => setQuery(e.target.value)}
    />
    {/* <div style={{ marginTop: 10 }}>
      <h4>Variables to propagate</h4>
      <FormGroup>
        {variables.sort((a, b) => { return a.name === b.name ? 0 : a.name < b.name ? -1 : 1; }).map((v) => {
          return (
            <FormControlLabel
              style={{ marginLeft: 15, marginTop: -10 }}
              key={v.name}
              control={
                <Checkbox
                  checked={v.checked}
                  onChange={(e) => {
                    const filtered = variables.filter((item) => {
                      return item.name !== v.name;
                    });
                    setVariables([
                      ...filtered,
                      { name: v.name, checked: !v.checked },
                    ]);
                  }}
                  name="checkedB"
                  color="primary"
                />
              }
              label={v.name}
            />
          );
        })}
      </FormGroup>
    </div> */}
    <Button style={{ marginTop: 15 }} onClick={doQuery} fullWidth color="primary" variant="contained">QUERY</Button>
    {/* <br />
    <h4 style={{ marginTop: 20 }}>Results</h4>

    <div style={{ height: 260 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10]}
        checkboxSelection
        onSelectionModelChange={propagate}
        disableSelectionOnClick
      />
    </div> */}
  </div>
    // <div>
    //   <h4>Query Module</h4>
    //   <TextField
    //     onChange={e => setQuery(e.target.value)}
    //     multiline
    //     fullWidth
    //     value={query}
    //     helperText={error}
    //     error={error}
    //   />
    //   <br />
    //   <Button onClick={doQuery}>Query</Button>
    // </div>
  )
}

export default App