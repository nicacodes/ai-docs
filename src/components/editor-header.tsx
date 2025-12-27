import { Ban, FileText, FolderUp, Plus } from 'lucide-react';
import { motion, type Variants, type Transition } from 'motion/react';
import { BtnSaveDoc } from './btn-save-doc';
import { useEditorActions } from './editor-actions';

const BUTTON_MOTION_CONFIG = {
  initial: 'rest',
  whileHover: 'hover',
  whileTap: 'tap',
  variants: {
    rest: { maxWidth: 40 },
    hover: {
      maxWidth: 140,
      transition: { type: 'spring', stiffness: 200, damping: 35, delay: 0.15 },
    },
    tap: { scale: 0.95 },
  },
  transition: { type: 'spring', stiffness: 250, damping: 25 },
} as const;

const LABEL_VARIANTS: Variants = {
  rest: { opacity: 0, x: 4 },
  hover: { opacity: 1, x: 0, visibility: 'visible' },
  tap: { opacity: 1, x: 0, visibility: 'visible' },
};

const LABEL_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

function ManagementBar() {
  const { newDoc, importMarkdown, exportMarkdown, exportPdf } =
    useEditorActions();

  return (
    <div className='@container/wrapper w-full flex justify-end sticky top-0 z-20 py-4 px-3'>
      <div className='flex w-fit flex-col @xl/wrapper:flex-row items-center gap-y-2 rounded-2xl border border-border p-2 shadow-lg backdrop-blur-sm bg-card/80 @xl/wrapper:space-x-3'>
        <div className='mx-auto flex flex-col @lg/wrapper:flex-row shrink-0 items-center'>
          <div className='mx-3 h-6 w-px rounded-full hidden @lg/wrapper:block' />

          <motion.div
            layout
            layoutRoot
            className='mx-auto flex flex-wrap space-x-2 sm:flex-nowrap'
          >
            <motion.button
              {...BUTTON_MOTION_CONFIG}
              className='flex h-10 items-center space-x-2 overflow-hidden whitespace-nowrap rounded-lg bg-blue-200/60 dark:bg-blue-800/80 px-2.5 py-2 text-blue-700 dark:text-blue-200'
              aria-label='Nuevo documento'
              onClick={() => newDoc()}
            >
              <Plus size={20} className='shrink-0' />
              <motion.span
                variants={LABEL_VARIANTS}
                transition={LABEL_TRANSITION}
                className='invisible text-sm'
              >
                Nuevo
              </motion.span>
            </motion.button>

            <motion.button
              {...BUTTON_MOTION_CONFIG}
              className='flex h-10 items-center space-x-2 overflow-hidden whitespace-nowrap rounded-lg bg-neutral-200/60 dark:bg-neutral-600/80 px-2.5 py-2 text-neutral-600 dark:text-neutral-200'
              aria-label='Exportar Markdown'
              onClick={() => exportMarkdown()}
            >
              <Ban size={20} className='shrink-0' />
              <motion.span
                variants={LABEL_VARIANTS}
                transition={LABEL_TRANSITION}
                className='invisible text-sm'
              >
                Exportar MD
              </motion.span>
            </motion.button>

            <motion.button
              {...BUTTON_MOTION_CONFIG}
              className='flex h-10 items-center space-x-2 overflow-hidden whitespace-nowrap rounded-lg bg-red-200/60 dark:bg-red-800/80 px-2.5 py-2 text-red-600 dark:text-red-300'
              aria-label='Exportar PDF'
              onClick={() => exportPdf()}
            >
              <FileText size={20} className='shrink-0' />
              <motion.span
                variants={LABEL_VARIANTS}
                transition={LABEL_TRANSITION}
                className='invisible text-sm'
              >
                Exportar PDF
              </motion.span>
            </motion.button>

            <motion.button
              {...BUTTON_MOTION_CONFIG}
              className='flex h-10 items-center space-x-2 overflow-hidden whitespace-nowrap rounded-lg bg-green-200/60 dark:bg-green-800/80 px-2.5 py-2 text-green-600 dark:text-green-300'
              aria-label='Importar Markdown'
              onClick={() => importMarkdown()}
            >
              <FolderUp size={20} className='shrink-0' />
              <motion.span
                variants={LABEL_VARIANTS}
                transition={LABEL_TRANSITION}
                className='invisible text-sm'
              >
                Importar
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <div className='mx-3 hidden h-6 w-px bg-border @xl/wrapper:block rounded-full' />
        <BtnSaveDoc />
      </div>
    </div>
  );
}

export { ManagementBar };
