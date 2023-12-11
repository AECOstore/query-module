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

let initialQuery = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
SELECT ?element_€ ?g
WHERE { GRAPH ?g {
 ?element_€ a beo:Door .
}}
`;

initialQuery = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
PREFIX props: <https://w3id.org/props#>
SELECT ?element_€ ?g
WHERE { GRAPH ?g {
 ?element_€ a beo:Door ;
  props:overallHeightIfcDoor_attribute_simple 2510.e0 .
}}
`

const rdfContentTypes = [
  "https://www.iana.org/assignments/media-types/text/turtle"
]

const App = ({ piral }) => {
  const constants = piral.getData("CONSTANTS")
  const [query, setQuery] = useState(initialQuery)
  const [queryResults, setQueryResults] = useState();
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

  
//   useEffect(() => {
//     getAllAllowedSources()
// }, [])

//   async function getAllAllowedSources() {
//     setLoading(true)
//     try {
//         const project = piral.getData(constants.ACTIVE_PROJECT)

//         const all = await piral.getResourcesByContentType(piral, rdfContentTypes)
//         console.log('all :>> ', all);
//         for (const res of all) {
//           const concepts = await piral.getAssociatedConcepts(res.distribution, project)
//           setAllowedResources(prev => {return {...prev, [res.distribution]: concepts}})
//         }
//     } catch (error) {
//         console.log('error :>> ', error);
//     }
//     setLoading(false)
// }

  function extractIdentifiers(bindings) {
    const identifiers = []
    const translation = translate(query);
    
    console.log('translation.variables :>> ', translation.variables);
    for (const v of translation.variables.map(i => i.value)) {
      console.log('v :>> ', v);
      if (v.endsWith("_€")) {
        for (const b of bindings){
        console.log('b[v] :>> ', b.get(v));
          identifiers.push(b.get(v).id)}
      }
    }
    return identifiers
  }

  async function doQuery() {
    const results = await piral.queryProject(piral, query)
    const vars = new Set()
    const refRegs = await piral.getReferenceRegistries(piral)
    await propagate(results)
  }

  async function propagate(r) {
    const ids = extractIdentifiers(r)
    console.log('ids :>> ', ids);
    const referenceRegistries = piral.getData(constants.REFERENCE_REGISTRY)
    console.log(referenceRegistries)

    const sparql = piral.getData(constants.SPARQL_STORE)
    let references = {}
    for (const id of ids) {
      console.log(id)
      const reference = await piral.findCollectionBySelector(referenceRegistries, undefined, id, sparql)
      console.log('reference :>> ', reference);
      references = {...references, ...reference}
    }
    piral.setDataGlobal(constants.SELECTED_CONCEPTS, references)
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
      {/* <Accordion expanded={openPanels.includes("sourcesPanel")} onChange={() => handleChange('sourcesPanel')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            Sources
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SourcesComponent setFilter={setFilter} getAllAllowedSources={getAllAllowedSources} loading={loading}/>
        </AccordionDetails>
      </Accordion> */}
      <Accordion expanded={openPanels.includes("queryPanel")} onChange={() => handleChange('queryPanel')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            Query
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>Set the variables to propagate by including a '_€'.</Typography>
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
      {/* <Accordion expanded={openPanels.includes("resultsPanel")} onChange={() => handleChange('resultsPanel')}>
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
      </div>
        </AccordionDetails>
      </Accordion> */}
    </div>
  )
}

export default App