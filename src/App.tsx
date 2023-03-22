import * as React from 'react'
import { useState, useEffect } from "react"
import { Button, TextField, FormGroup, FormControlLabel, Checkbox, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Accordion, AccordionDetails, AccordionSummary } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { DCAT } from '@inrupt/vocab-common-rdf'

import { translate } from "sparqlalgebrajs";
import { Catalog } from 'consolid-daapi'
import { Session } from '@inrupt/solid-client-authn-browser'
import { PiletApi } from 'consolid-shell';
import { QueryEngine } from '@comunica/query-sparql'
import { ReferenceRegistry } from 'consolid-raapi';
import registerServiceWorker from 'react-service-worker';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import SourcesComponent from './components/SourcesComponent'

const initialQuery = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
SELECT ?element_€
WHERE {
 ?element_€ a beo:Door .
}
`;

const rdfContentTypes = [
  "https://www.iana.org/assignments/media-types/text/turtle"
]

const App = ({ piral }) => {
  const constants = piral.getData("CONSTANTS")
  const [query, setQuery] = useState(initialQuery)
  const [queryResults, setQueryResults] = useState([]);
  const [filter, setFilter] = useState(`?resource <${DCAT.mediaType}> <https://www.iana.org/assignments/media-types/model/gltf+json>`)
  // const [variables, setVariables] = useState([]);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [openPanels, setOpenPanels] = useState(["queryPanel"])
  const [loading, setLoading] = useState(false)
  const [allowedResources, setAllowedResources] = useState([])
  const [allowedConcepts, setAllowedConcepts] = useState([])

  // useEffect(() => {
  //   try {
  //     const checkedVar = variables
  //       .filter((variable) => {
  //         return variable.checked;
  //       })
  //       .map((e) => e.name);
  //     const translation = translate(query);
  //     setError(null);
  //     setVariables(translation.variables.map(i => i.value))
  //     // setVariables(
  //     //   translation.variables.map((e) => {
  //     //     return {
  //     //       name: e.value,
  //     //       checked: true,
  //     //     };
  //     //   })
  //     // );
  //   } catch (error) {
  //     setError(error.message);
  //   }
  // }, [query]);

  useEffect(() => {
    if (queryResults && queryResults.head) {
      const columnShape = queryResults.head.vars.map((v) => {
        return {
          field: v,
          headerName: v,
          width: 200,
          editable: true
        }
      })
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

  
  useEffect(() => {
    getAllAllowedSources()
}, [])

 async function getFilteredResources() {
  setLoading(true)
  try {
      const project = piral.getData(constants.ACTIVE_PROJECT)
      let f = filter
      const all = await piral.getResourcesByFilter(project, f)
      console.log('all :>> ', all);
  } catch (error) {
      console.log('error :>> ', error);
  }
  setLoading(false)
 }
 
  async function getAllAllowedSources() {
    setLoading(true)
    try {
        const project = piral.getData(constants.ACTIVE_PROJECT)
        let f = ``
        for (const [index, contentType] of rdfContentTypes.entries()) {
            f += `{?resource <${DCAT.mediaType}> <${contentType}>}`
            if (index < rdfContentTypes.length  - 1 ) {
                f += " UNION "
            }
        }
        const all = await piral.getResourcesByFilter(project, f)
        for (const res of all) {
          const concepts = await piral.getAssociatedConcepts(res.resource.value, project)
          setAllowedResources(prev => {return {...prev, [res.resource.value]: concepts}})
        }
    } catch (error) {
        console.log('error :>> ', error);
    }
    setLoading(false)
}

  function extractIdentifiers(bindings, vars) {
    const identifiers = []
    for (const v of vars) {
      console.log('v :>> ', v);
      if (v.endsWith("_€")) {
        for (const b of bindings)
          identifiers.push(b[v].value)
      }
    }
    return identifiers
  }

  async function doQuery() {
    const p = piral.getData(constants.ACTIVE_PROJECT)
    const r = {}
    const vars = new Set()
    for (const partial of p) {
      const results = await piral.querySatellite(query, partial.endpoint).then(i => i.json())
      results.head.vars.forEach(i => vars.add(i))
      r[partial.referenceRegistry] = results
      setQueryResults(prev => {return {...prev, [partial.referenceRegistry]: results}})
    }
    await propagate(r, Array.from(vars))
  }

  async function propagate(r, vars) {
    const p = piral.getData(constants.ACTIVE_PROJECT)
    const preQuery = {}
    Object.keys(allowedResources).map(i => allowedResources[i]).forEach(item => {Object.assign(preQuery, item)})
    const flatRes = Object.keys(r).map(i => r[i].results.bindings).flat()
    const ids = extractIdentifiers(flatRes, vars)
    const concepts = await piral.getAllReferences(preQuery, ids, p)
    piral.setDataGlobal(constants.SELECTED_CONCEPTS, concepts)
  }

  function handleChange(panel) {
    if (openPanels.includes(panel)) {
      setOpenPanels(prev => prev.filter(item => item != panel))
    } else {
      setOpenPanels(prev => [...prev, panel])
    }
  }

  return (
    <div>
      <Typography>Project Data Query</Typography>
      <Accordion expanded={openPanels.includes("sourcesPanel")} onChange={() => handleChange('sourcesPanel')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            Sources
          </Typography>
          {/* <Typography sx={{ color: 'text.secondary' }}>Set the sources for your query</Typography> */}
        </AccordionSummary>
        <AccordionDetails>
          {/* <SourcesComponent setFilter={setFilter} getAllAllowedSources={getAllAllowedSources} loading={loading}/> */}
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={openPanels.includes("queryPanel")} onChange={() => handleChange('queryPanel')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            Query
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
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
          <Button style={{ marginTop: 15 }} disabled={loading} onClick={doQuery} fullWidth color="primary" variant="contained">QUERY</Button>
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={openPanels.includes("resultsPanel")} onChange={() => handleChange('resultsPanel')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            Results
          </Typography>
        </AccordionSummary>
        <AccordionDetails>

      {/* <div style={{ height: 260 }}>
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
        </AccordionDetails>
      </Accordion>
    </div>
  )
}

export default App