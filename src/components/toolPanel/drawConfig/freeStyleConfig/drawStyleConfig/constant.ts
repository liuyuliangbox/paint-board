import { DrawStyle } from '@/constants/draw'

interface StyleSwitchType {
  type: string
  text: string
  keyboard: string
}

/** Two per row so phone landscape can stay narrow (mask click-to-close). */
export const styleSwitch: Record<string, Array<StyleSwitchType>> = {
  line_1: [
    {
      type: DrawStyle.Basic,
      text: 'style.basic',
      keyboard: 'Q'
    },
    {
      type: DrawStyle.Freehand,
      text: 'style.freehand',
      keyboard: 'W'
    }
  ],
  line_2: [
    {
      type: DrawStyle.FreehandStroke,
      text: 'style.freehandStroke',
      keyboard: 'Y'
    },
    {
      type: DrawStyle.Rainbow,
      text: 'style.rainbow',
      keyboard: 'A'
    }
  ],
  line_3: [
    {
      type: DrawStyle.Shape,
      text: 'style.shape',
      keyboard: 'S'
    },
    {
      type: DrawStyle.Material,
      text: 'style.material',
      keyboard: 'D'
    }
  ],
  line_4: [
    {
      type: DrawStyle.Pixels,
      text: 'style.pixels',
      keyboard: 'Z'
    },
    {
      type: DrawStyle.MultiColor,
      text: 'style.multiColor',
      keyboard: 'X'
    }
  ],
  line_5: [
    {
      type: DrawStyle.Text,
      text: 'style.text',
      keyboard: 'C'
    },
    {
      type: DrawStyle.MultiLine,
      text: 'style.multiLine',
      keyboard: 'R'
    }
  ],
  line_6: [
    {
      type: DrawStyle.Reticulate,
      text: 'style.reticulate',
      keyboard: 'F'
    },
    {
      type: DrawStyle.MultiPoint,
      text: 'style.multiPoint',
      keyboard: 'V'
    }
  ],
  line_7: [
    {
      type: DrawStyle.Wiggle,
      text: 'style.wiggle',
      keyboard: 'T'
    },
    {
      type: DrawStyle.Thorn,
      text: 'style.thorn',
      keyboard: 'G'
    }
  ],
  line_8: [
    {
      type: DrawStyle.Ink,
      text: 'style.ink',
      keyboard: 'N'
    }
  ]
}
