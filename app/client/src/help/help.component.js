const ctrlDef = ['$fancyModal', function($fancyModal) {
    /**
     * Uses the 3rd party $fancyModal service to open a modal dialog that
     * displays the contents of the 'help-dialog' partial template.
     */
    this.open = () => {
        $fancyModal.open({ templateUrl: '/partial/help-dialog '});
    };
}];

module.exports = {
    templateUrl: '/partial/help',
    controller: ctrlDef
};
