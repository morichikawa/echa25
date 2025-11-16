import { ToggleButton } from '@mui/material'

interface ToolButtonProps {
  value: string
  selected: boolean
  icon: React.ReactNode
  label: string
  onChange: (value: string) => void
}

const ToolButton = ({ value, selected, icon, label, onChange }: ToolButtonProps) => {
  return (
    <ToggleButton
      value={value}
      selected={selected}
      onChange={() => onChange(value)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
    >
      {icon}
      <span style={{ fontSize: '12px' }}>{label}</span>
    </ToggleButton>
  )
}

export default ToolButton
