const ctrlDef = ['$fancyModal', function($fancyModal) {
    /**
     * Uses the 3rd party $fancyModal service to open a modal dialog that
     * displays the contents of the 'help-dialog' partial template.
     */
    this.open = () => {
        $fancyModal.open({ template: require('./help-dialog.template.pug') });
    };
}];

module.exports = {
    template: require('./help.template.pug'),
    controller: ctrlDef
};
