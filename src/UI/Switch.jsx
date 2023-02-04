import { Switch } from "@headlessui/react";

function classNames(...classes) {
   return classes.filter(Boolean).join(" ");
}

export default function MySwitch({ checked, setChecked }) {
   return (
      <Switch
         checked={checked}
         onChange={setChecked}
         className={classNames(
            "bg-stone-500 relative inline-flex h-3.5 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
         )}
      >
         <span className="sr-only">Use setting</span>
         <span
            aria-hidden="true"
            className={classNames(
               checked ? "translate-x-3.5" : "translate-x-0",
               "pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
         />
      </Switch>
   );
}
