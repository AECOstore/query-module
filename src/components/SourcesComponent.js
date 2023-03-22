import React, { useState, useEffect } from 'react'
import { Button, TextField, Typography} from '@mui/material'

const SourcesComponent = ({ setFilter, filter, sourceSetter, loading}) => {

    return (
        <div>
          <TextField
            id="outlined-multiline-flexible"
            label="Apply filter for ?resource"
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <Button style={{ marginTop: 15 }} onClick={() => sourceSetter()} disabled={loading} fullWidth color="primary" variant="contained">APPLY FILTER</Button>
        </div>
    )
}

export default SourcesComponent