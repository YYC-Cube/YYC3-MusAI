/**
 * @file xiaoyuAnimations.ts
 * @description 内置小语 Lottie 兜底动画，避免依赖应用 public 目录或 `@/` 别名
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 * @license MIT
 * @tags xiaoyu,lottie,animation,fallback
 */

import { XiaoyuEmotionType } from '../../types/Xiaoyu.types';

const EMOTION_COLORS: Record<XiaoyuEmotionType, [number, number, number]> = {
  happy: [1, 0.78, 0.28],
  anxious: [0.62, 0.72, 0.98],
  surprised: [0.98, 0.55, 0.45],
  neutral: [0.72, 0.84, 0.92]
};

/**
 * 生成最小可用的 Lottie 动画（圆环描边 + 上下浮动）。
 * 内置而非远程加载：包被任何应用消费时都不依赖 `@/` 别名或 public 目录。
 */
function createFallbackAnimation(emotion: XiaoyuEmotionType, scale = 1) {
  const [r, g, b] = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.neutral;

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: `xiaoyu-${emotion}`,
    ddd: 0,
    assets: [],
    fonts: { list: [] },
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'face',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [100, 100, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [scale * 100, scale * 100, 100] }
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            it: [
              { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] } },
              {
                ty: 'st',
                c: { a: 0, k: [r, g, b, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 10 },
                lc: 1,
                lj: 1
              },
              {
                ty: 'tr',
                p: { a: 1, k: [
                  { t: 0, s: [0, 0], e: [0, -10] },
                  { t: 30, s: [0, -10], e: [0, 0] },
                  { t: 60, s: [0, 0], e: [0, 0] }
                ] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
                sk: { a: 0, k: 0 },
                sa: { a: 0, k: 0 }
              }
            ]
          }
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0
      }
    ]
  };
}

const FALLBACK_ANIMATIONS: Record<XiaoyuEmotionType, ReturnType<typeof createFallbackAnimation>> = {
  happy: createFallbackAnimation('happy'),
  anxious: createFallbackAnimation('anxious'),
  surprised: createFallbackAnimation('surprised'),
  neutral: createFallbackAnimation('neutral')
};

export function getFallbackAnimation(emotion: XiaoyuEmotionType) {
  return FALLBACK_ANIMATIONS[emotion] ?? FALLBACK_ANIMATIONS.neutral;
}
