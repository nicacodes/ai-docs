import { Command, LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback } from 'react';
import { useEditorActions, useSaveShortcut } from './editor-actions';

export const BtnSaveDoc = () => {
  const { save, isBusy, canSave, saveLabel } = useEditorActions();
  const handleSave = useCallback(() => {
    void save();
  }, [save]);

  useSaveShortcut(handleSave);

  return (
    <motion.button
      whileTap={{ scale: 0.975 }}
      disabled={!canSave}
      onClick={handleSave}
      className='flex h-10 text-sm cursor-pointer items-center justify-center rounded-lg bg-teal-500 dark:bg-teal-600/80 px-3 py-2 text-white transition-colors duration-300 dark:hover:bg-teal-800 hover:bg-teal-600 w-full @xl/wrapper:w-auto disabled:opacity-70 disabled:cursor-not-allowed'
      aria-label='Guardar'
    >
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className='flex items-center gap-2'
      >
        {isBusy ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            className='inline-flex'
          >
            <LoaderCircle size={16} />
          </motion.span>
        ) : null}
        <span>{saveLabel}</span>
      </motion.span>

      {!isBusy ? (
        <>
          <div className='mx-3 h-5 w-px bg-white/40 rounded-full' />
          <div className='flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 -mr-1'>
            <Command size={14} />
            CTRL + S
          </div>
        </>
      ) : null}
    </motion.button>
  );
};
